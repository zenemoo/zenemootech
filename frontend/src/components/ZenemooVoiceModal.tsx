import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Square,
  RefreshCw,
  X,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { AiLanguage, LANGUAGE_LABEL_MAP } from '../lib/aiStore';

export type VoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'completed'
  | 'closing'
  | 'permission_denied'
  | 'unsupported'
  | 'no_speech'
  | 'error';

export type MicPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported' | 'unknown';

/**
 * Universal Permission State Detection
 */
export const getMicrophonePermissionState = async (): Promise<MicPermissionState> => {
  if (typeof window === 'undefined') return 'unknown';

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition && !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }

  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return status.state as MicPermissionState;
    } catch (e) {
      // Query for 'microphone' might be restricted in some browser engines
    }
  }

  return 'unknown';
};

interface ZenemooVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptComplete: (transcript: string) => void;
  currentLanguage?: AiLanguage;
}

export const ZenemooVoiceModal: React.FC<ZenemooVoiceModalProps> = ({
  isOpen,
  onClose,
  onTranscriptComplete,
  currentLanguage = 'en',
}) => {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(2);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const speechDetectedRef = useRef<boolean>(false);
  const closingTimeoutRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Map application language to speech recognition language tags
  const getRecognitionLang = (lang: AiLanguage): string => {
    switch (lang) {
      case 'hi':
        return 'hi-IN';
      case 'or':
        return 'or-IN';
      case 'en':
      default:
        return 'en-IN';
    }
  };

  const cleanupRecognition = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (closingTimeoutRef.current) {
      clearTimeout(closingTimeoutRef.current);
      closingTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors if already inactive
      }
      recognitionRef.current = null;
    }
  }, []);

  const finalizeAndClose = useCallback(
    (textToInsert: string) => {
      const trimmed = textToInsert.trim();
      if (!trimmed) {
        setState('no_speech');
        return;
      }

      setState('completed');
      setCountdown(2);

      let remaining = 2;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, 1000);

      closingTimeoutRef.current = setTimeout(() => {
        cleanupRecognition();
        onTranscriptComplete(trimmed);
        onClose();
      }, 2000);
    },
    [cleanupRecognition, onTranscriptComplete, onClose]
  );

  const startListening = useCallback(async () => {
    cleanupRecognition();
    setTranscript('');
    setInterimText('');
    setErrorMessage('');
    finalTranscriptRef.current = '';
    speechDetectedRef.current = false;

    // Feature Detection
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState('unsupported');
      setErrorMessage(
        "Voice input isn't supported in this browser. You can continue using standard text input."
      );
      return;
    }

    try {
      // Check actual permission state
      const permState = await getMicrophonePermissionState();

      if (permState === 'denied') {
        setState('permission_denied');
        setErrorMessage(
          'Microphone access is blocked. Please enable microphone permission in your browser or device settings.'
        );
        return;
      }

      // If already granted, immediately jump to listening state
      if (permState === 'granted') {
        setState('listening');
      } else {
        setState('listening'); // Optimistic start for instant listening feel
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getRecognitionLang(currentLanguage);
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setState('listening');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcriptChunk = result[0].transcript;
          if (result.isFinal) {
            currentFinal += transcriptChunk + ' ';
          } else {
            currentInterim += transcriptChunk;
          }
        }

        if (currentFinal.trim()) {
          speechDetectedRef.current = true;
          finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + currentFinal).trim();
          setTranscript(finalTranscriptRef.current);
        }

        if (currentInterim.trim()) {
          speechDetectedRef.current = true;
          setInterimText(currentInterim);
        } else {
          setInterimText('');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Zenemoo Voice Error]:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setState('permission_denied');
          setErrorMessage(
            'Microphone access was denied. Please enable microphone permission in your device settings.'
          );
        } else if (event.error === 'no-speech') {
          if (!speechDetectedRef.current && !finalTranscriptRef.current) {
            setState('no_speech');
          }
        } else if (event.error === 'network') {
          setState('error');
          setErrorMessage('Speech recognition network service error. Please try again.');
        } else {
          setState('error');
          setErrorMessage(`Speech recognition error (${event.error || 'unknown'}).`);
        }
      };

      recognition.onspeechend = () => {
        if (recognitionRef.current && speechDetectedRef.current) {
          setState('processing');
          setTimeout(() => {
            const fullText = (
              finalTranscriptRef.current +
              ' ' +
              interimText
            ).trim();
            finalizeAndClose(fullText);
          }, 400);
        }
      };

      recognition.onend = () => {
        if (state === 'listening' || state === 'processing') {
          const fullText = (finalTranscriptRef.current + ' ' + interimText).trim();
          if (fullText) {
            finalizeAndClose(fullText);
          } else if (!speechDetectedRef.current) {
            setState('no_speech');
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error('[Zenemoo Voice Startup Error]:', err);
      setState('error');
      setErrorMessage(err.message || 'Failed to initialize voice input.');
    }
  }, [cleanupRecognition, currentLanguage, finalizeAndClose, interimText, state]);

  // Handle Stop Button Click
  const handleStopManually = () => {
    setState('processing');
    const fullCaptured = (finalTranscriptRef.current + ' ' + interimText).trim();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (fullCaptured) {
      finalizeAndClose(fullCaptured);
    } else {
      setState('no_speech');
    }
  };

  // Keyboard Accessibility (ESC key to dismiss) & Body Scroll Locking
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        cleanupRecognition();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, cleanupRecognition, onClose]);

  // Start on Modal Open & Cleanup on Unmount
  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      cleanupRecognition();
    }
    return () => {
      cleanupRecognition();
    };
  }, [isOpen, startListening, cleanupRecognition]);

  if (!isOpen || !isMounted) return null;

  const currentLangMeta = LANGUAGE_LABEL_MAP[currentLanguage] || {
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
  };

  const displayText = transcript || interimText;

  // Render via React Portal into document.body to escape any parent CSS transforms/drawers
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zenemoo-voice-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && state !== 'listening') {
          cleanupRecognition();
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 26, stiffness: 290 }}
        className="relative w-full max-w-[480px] rounded-3xl bg-[#080d19]/95 backdrop-blur-2xl border border-cyan-500/25 p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_50px_rgba(6,182,212,0.18)] text-white space-y-5 overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Border Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400" />

        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="zenemoo-voice-title" className="font-display font-bold text-sm sm:text-base text-white tracking-wide">
                Zenemoo Voice Input
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Language: {currentLangMeta.flag} {currentLangMeta.nativeName} ({currentLangMeta.name})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              cleanupRecognition();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
            aria-label="Close voice input"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Center Animated Microphone & Waveform Canvas */}
        <div className="flex flex-col items-center justify-center py-2 space-y-4">
          <div className="relative flex items-center justify-center">
            {/* Outer Animated Pulse Rings */}
            {state === 'listening' && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-cyan-500/20 blur-md pointer-events-none"
                />
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
                  className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-purple-500/20 blur-sm pointer-events-none"
                />
              </>
            )}

            {/* Central Circular Microphone Hub */}
            <div
              className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                state === 'listening'
                  ? 'bg-gradient-to-br from-cyan-400 to-purple-600 text-black shadow-cyan-500/40 ring-4 ring-cyan-400/30'
                  : state === 'completed'
                  ? 'bg-emerald-500 text-white shadow-emerald-500/40'
                  : state === 'no_speech' || state === 'permission_denied' || state === 'error' || state === 'unsupported'
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {state === 'completed' ? (
                <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9" />
              ) : state === 'permission_denied' || state === 'unsupported' || state === 'error' ? (
                <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
              ) : (
                <Mic className={`w-7 h-7 sm:w-8 sm:h-8 ${state === 'listening' ? 'animate-pulse' : ''}`} />
              )}
            </div>
          </div>

          {/* Equalizer Waveform Visualization (Listening State Only) */}
          {state === 'listening' && (
            <div className="flex items-center justify-center gap-1.5 h-6">
              {[0.4, 0.8, 0.5, 1.0, 0.6, 0.9, 0.3, 0.7, 0.5].map((scale, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: ['6px', `${Math.max(8, scale * 22)}px`, '6px'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6 + (i % 3) * 0.2,
                    ease: 'easeInOut',
                  }}
                  className="w-1 rounded-full bg-gradient-to-t from-cyan-400 to-purple-400"
                />
              ))}
            </div>
          )}

          {/* State Status Text */}
          <div className="text-center space-y-1">
            {state === 'listening' && (
              <p className="text-xs sm:text-sm font-display font-semibold text-cyan-300">
                Listening... Speak naturally in {currentLangMeta.name}
              </p>
            )}
            {state === 'processing' && (
              <p className="text-xs sm:text-sm font-mono text-purple-300 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Processing speech...</span>
              </p>
            )}
            {state === 'completed' && (
              <p className="text-xs sm:text-sm font-display font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Speech captured! Inserting in {countdown}s...</span>
              </p>
            )}
            {state === 'no_speech' && (
              <p className="text-xs sm:text-sm font-sans text-slate-300">
                No speech detected. Please speak closer to your microphone.
              </p>
            )}
            {(state === 'permission_denied' || state === 'unsupported' || state === 'error') && (
              <p className="text-xs sm:text-sm font-sans text-rose-300 max-w-sm mx-auto">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* Live Transcription Display Area */}
        <div
          aria-live="polite"
          className={`rounded-2xl border p-4 min-h-[90px] max-h-[140px] overflow-y-auto transition-all text-left scrollbar-thin ${
            state === 'completed'
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : displayText
              ? 'bg-black/40 border-cyan-500/30 shadow-inner'
              : 'bg-white/[0.02] border-white/5'
          }`}
        >
          {displayText ? (
            <p className="text-xs sm:text-sm text-slate-100 font-sans leading-relaxed whitespace-pre-wrap">
              <span>{transcript}</span>
              {interimText && (
                <span className="text-cyan-300/80 italic font-mono"> {interimText}</span>
              )}
            </p>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs font-mono">
              {state === 'listening' ? '"Tell me about Zenemoo transcription services..."' : 'Voice transcript will appear here...'}
            </div>
          )}
        </div>

        {/* Action Controls & Footer Buttons */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {state === 'listening' && (
            <button
              type="button"
              onClick={handleStopManually}
              className="w-full py-3 px-5 rounded-2xl bg-rose-600/90 hover:bg-rose-500 text-white font-sans text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
              aria-label="Stop listening"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>■ Stop Listening</span>
            </button>
          )}

          {state === 'completed' && (
            <button
              type="button"
              onClick={() => {
                cleanupRecognition();
                onTranscriptComplete((transcript || interimText).trim());
                onClose();
              }}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-sans text-xs sm:text-sm font-extrabold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
            >
              <span>Use Transcript Now →</span>
            </button>
          )}

          {(state === 'no_speech' || state === 'error' || state === 'permission_denied') && (
            <div className="w-full flex items-center gap-2.5">
              <button
                type="button"
                onClick={startListening}
                className="flex-1 py-3 px-4 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-sans text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
              >
                <Mic className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  cleanupRecognition();
                  onClose();
                }}
                className="py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-slate-300 font-sans text-xs sm:text-sm font-medium transition-all cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          )}

          {state === 'unsupported' && (
            <button
              type="button"
              onClick={() => {
                cleanupRecognition();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/12 border border-white/10 text-slate-200 font-sans text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px]"
            >
              Continue with Text Input
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
export default ZenemooVoiceModal;

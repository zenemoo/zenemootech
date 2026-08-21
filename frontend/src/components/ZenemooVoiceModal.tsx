import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import {
  Mic,
  Square,
  RefreshCw,
  X,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { AiLanguage, LANGUAGE_LABEL_MAP } from '../lib/aiStore';

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'completed'
  | 'permission_prompt'
  | 'permission_denied'
  | 'unsupported'
  | 'no_speech'
  | 'error';

export type MicPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

/**
 * Universal Permission State Detection & Native Requester
 */
export const requestAndVerifyMicrophonePermission = async (): Promise<MicPermissionState> => {
  if (typeof window === 'undefined') return 'unsupported';

  // 1. Native Capacitor Android check
  if (Capacitor.isNativePlatform()) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return 'denied';
      }
      return 'denied';
    }
  }

  // 2. Standard Web Browser Permissions Query (if supported)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (status.state === 'granted') return 'granted';
      if (status.state === 'denied') return 'denied';
    } catch (e) {
      // Query for 'microphone' might be restricted in some browser engines
    }
  }

  // 3. Web getUserMedia request
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return 'denied';
      }
      return 'denied';
    }
  }

  return 'unsupported';
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
  // ── UI States (Isolated from Recognition Engine Lifecycle) ──
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(2);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

  // ── Engine Lifecycle Refs (Stable across all React re-renders) ──
  const recognitionRef = useRef<any>(null);
  const activeSessionIdRef = useRef<number>(0);
  const isStartingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const shouldContinueListeningRef = useRef<boolean>(false);
  const accumulatedFinalRef = useRef<string>('');
  const restartTimerRef = useRef<any>(null);
  const closingTimeoutRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);

  // Silent Dev Log Helper
  const logDiag = (sessionId: number, message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Zenemoo Voice][Session ${sessionId}] ${message}`);
    }
  };

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

  // ── Hard Engine Cleanup ──
  const cleanupEngine = () => {
    shouldContinueListeningRef.current = false;
    isStartingRef.current = false;
    isListeningRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (closingTimeoutRef.current) {
      clearTimeout(closingTimeoutRef.current);
      closingTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onaudiostart = null;
        recognitionRef.current.onsoundstart = null;
        recognitionRef.current.onspeechstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.onsoundend = null;
        recognitionRef.current.onaudioend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore stop errors if already inactive
      }
      recognitionRef.current = null;
    }
  };

  // ── Finalize Transcript and Auto-Close ──
  const finalizeAndClose = (sessionId: number, textToInsert: string) => {
    if (sessionId !== activeSessionIdRef.current) return;
    shouldContinueListeningRef.current = false;

    const trimmed = textToInsert.trim();
    if (!trimmed) {
      logDiag(sessionId, 'NO SPEECH CAPTURED');
      setState('no_speech');
      return;
    }

    logDiag(sessionId, `FINALIZING: "${trimmed}"`);
    setState('completed');
    setCountdown(2);

    let remaining = 2;
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }, 1000);

    closingTimeoutRef.current = setTimeout(() => {
      if (sessionId !== activeSessionIdRef.current) return;
      cleanupEngine();
      onTranscriptComplete(trimmed);
      onClose();
    }, 2000);
  };

  // ── Start Recognition Engine AFTER Permission Granted ──
  const startRecognitionAfterPermission = (sessionId: number) => {
    if (sessionId !== activeSessionIdRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      logDiag(sessionId, 'UNSUPPORTED: SpeechRecognition API missing');
      setState('unsupported');
      setErrorCode('api-unsupported');
      setErrorMessage(
        "Voice input isn't supported in this browser. You can continue using text input."
      );
      return;
    }

    const targetLang = getRecognitionLang(currentLanguage);
    logDiag(sessionId, `Creating SpeechRecognition (lang: ${targetLang}, continuous: true, interimResults: true)`);

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = targetLang;
    recognition.maxAlternatives = 1;

    // Event Handlers
    recognition.onstart = () => {
      if (sessionId !== activeSessionIdRef.current) return;
      isStartingRef.current = false;
      isListeningRef.current = true;
      logDiag(sessionId, 'ONSTART: Listening');
      setState('listening');
    };

    recognition.onaudiostart = () => {
      if (sessionId !== activeSessionIdRef.current) return;
      logDiag(sessionId, 'AUDIO START');
    };

    recognition.onspeechstart = () => {
      if (sessionId !== activeSessionIdRef.current) return;
      logDiag(sessionId, 'SPEECH DETECTED');
    };

    recognition.onresult = (event: any) => {
      if (sessionId !== activeSessionIdRef.current) return;

      let sessionInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        const text = res[0]?.transcript || '';
        if (res.isFinal) {
          accumulatedFinalRef.current = (
            accumulatedFinalRef.current ? accumulatedFinalRef.current + ' ' : ''
          ) + text.trim();
          logDiag(sessionId, `FINAL CHUNK: "${text.trim()}"`);
        } else {
          sessionInterim += text;
        }
      }

      const cleanFinal = accumulatedFinalRef.current.trim();
      const cleanInterim = sessionInterim.trim();

      setTranscript(cleanFinal);
      setInterimText(cleanInterim);

      if (transcriptBoxRef.current) {
        transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
      }
    };

    recognition.onerror = (event: any) => {
      if (sessionId !== activeSessionIdRef.current) return;
      logDiag(sessionId, `ONERROR: ${event.error}`);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldContinueListeningRef.current = false;
        isListeningRef.current = false;
        setErrorCode('not-allowed');
        setState('permission_denied');
        setErrorMessage(
          'Microphone access was denied. Please allow microphone permission in your browser or device settings.'
        );
      } else if (event.error === 'no-speech') {
        logDiag(sessionId, 'NO-SPEECH (non-fatal silence)');
      } else if (event.error === 'network') {
        shouldContinueListeningRef.current = false;
        isListeningRef.current = false;
        setErrorCode('network');
        setState('error');
        setErrorMessage(
          'Speech recognition network service error (network). Check your connection and try again.'
        );
      } else if (event.error === 'language-not-supported') {
        shouldContinueListeningRef.current = false;
        isListeningRef.current = false;
        setErrorCode('language-not-supported');
        setState('error');
        setErrorMessage(
          `Speech recognition language (${targetLang}) is not supported on this device.`
        );
      } else if (event.error !== 'aborted') {
        setErrorCode(event.error || 'unknown');
      }
    };

    recognition.onend = () => {
      if (sessionId !== activeSessionIdRef.current) return;
      isListeningRef.current = false;
      isStartingRef.current = false;
      logDiag(sessionId, 'ONEND');

      if (shouldContinueListeningRef.current) {
        logDiag(sessionId, 'CONTROLLED RESTART (250ms)');
        restartTimerRef.current = setTimeout(() => {
          if (
            sessionId === activeSessionIdRef.current &&
            shouldContinueListeningRef.current &&
            recognitionRef.current &&
            !isListeningRef.current &&
            !isStartingRef.current
          ) {
            try {
              isStartingRef.current = true;
              recognitionRef.current.start();
              logDiag(sessionId, 'RESTART SUCCESSFUL');
            } catch (startErr: any) {
              isStartingRef.current = false;
              logDiag(sessionId, `RESTART FAILED: ${startErr.message}`);
            }
          }
        }, 250);
      }
    };

    if (!isStartingRef.current && !isListeningRef.current) {
      isStartingRef.current = true;
      logDiag(sessionId, 'START REQUEST: calling recognition.start()');
      recognition.start();
    }
  };

  // ── Session Starter with Permission Gate ──
  const initAndStartSession = async (sessionId: number) => {
    cleanupEngine();
    if (sessionId !== activeSessionIdRef.current) return;

    accumulatedFinalRef.current = '';
    setTranscript('');
    setInterimText('');
    setErrorMessage('');
    setErrorCode('');
    shouldContinueListeningRef.current = true;

    logDiag(sessionId, 'SESSION CREATED');

    // 1. Verify Microphone Permission
    const permState = await requestAndVerifyMicrophonePermission();
    logDiag(sessionId, `Permission state: ${permState}`);

    if (sessionId !== activeSessionIdRef.current) return;

    if (permState === 'granted') {
      // Case 1: Permission already granted -> start recognition directly!
      startRecognitionAfterPermission(sessionId);
    } else if (permState === 'denied') {
      // Case 3: Permission denied -> show friendly in-app explanation
      shouldContinueListeningRef.current = false;
      setState('permission_prompt');
    } else {
      // Unsupported
      shouldContinueListeningRef.current = false;
      setState('unsupported');
      setErrorMessage("Microphone audio capture is not supported on this device.");
    }
  };

  // User taps [ Allow Microphone ] button on in-app prompt
  const handleUserAllowPermission = async () => {
    const currentSessionId = activeSessionIdRef.current;
    setIsRequestingPermission(true);
    try {
      const permState = await requestAndVerifyMicrophonePermission();
      setIsRequestingPermission(false);
      if (permState === 'granted') {
        startRecognitionAfterPermission(currentSessionId);
      } else {
        setState('permission_denied');
        setErrorMessage(
          'Microphone access is disabled for Zenemoo. Enable microphone permission in your device or browser settings.'
        );
      }
    } catch (e: any) {
      setIsRequestingPermission(false);
      setState('permission_denied');
      setErrorMessage('Microphone access was not granted.');
    }
  };

  // Handle Manual Stop Button
  const handleStopManually = () => {
    const currentSessionId = activeSessionIdRef.current;
    logDiag(currentSessionId, 'STOP REQUEST (User clicked Stop)');
    shouldContinueListeningRef.current = false;
    setState('processing');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const fullCaptured = (accumulatedFinalRef.current + ' ' + interimText).trim();
    if (fullCaptured) {
      finalizeAndClose(currentSessionId, fullCaptured);
    } else {
      setState('no_speech');
    }
  };

  // Modal Lifecycle Effect
  useEffect(() => {
    if (isOpen) {
      const newSessionId = Date.now();
      activeSessionIdRef.current = newSessionId;
      initAndStartSession(newSessionId);
    } else {
      cleanupEngine();
      setState('idle');
    }

    return () => {
      cleanupEngine();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentLanguage]);

  // Keyboard Accessibility & Body Scroll Lock
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        cleanupEngine();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !isMounted) return null;

  const currentLangMeta = LANGUAGE_LABEL_MAP[currentLanguage] || {
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
  };

  const hasContent = transcript.trim() || interimText.trim();

  // Render via React Portal into document.body
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zenemoo-voice-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && state !== 'listening') {
          cleanupEngine();
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 26, stiffness: 290 }}
        className="relative w-full max-w-[460px] rounded-3xl bg-[#080d19]/95 backdrop-blur-2xl border border-cyan-500/25 p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_50px_rgba(6,182,212,0.18)] text-white space-y-5 overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Glow */}
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
              cleanupEngine();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
            aria-label="Close voice input"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── PERMISSION PROMPT VIEW ── */}
        {state === 'permission_prompt' ? (
          <div className="py-3 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
              <Mic className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white font-display">🎙️ Microphone Access</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Zenemoo needs microphone access to convert your spoken words into text. Your voice is only used for this feature.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isRequestingPermission}
                onClick={handleUserAllowPermission}
                className="w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
              >
                {isRequestingPermission ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Requesting...</span>
                  </>
                ) : (
                  <span>Allow Microphone</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  cleanupEngine();
                  onClose();
                }}
                className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-white/[0.04] hover:bg-white/10 text-slate-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px]"
              >
                Not Now
              </button>
            </div>
          </div>
        ) : state === 'permission_denied' ? (
          /* ── PERMISSION DENIED / SETTINGS GUIDE VIEW ── */
          <div className="py-3 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white font-display">🎙️ Microphone Permission Required</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Microphone access is currently disabled for Zenemoo. Please enable microphone permission in your device or browser settings.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleUserAllowPermission}
                className="flex-1 py-3 px-4 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px]"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => {
                  cleanupEngine();
                  onClose();
                }}
                className="py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/10 text-slate-300 font-medium text-xs sm:text-sm transition-all cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── ACTIVE VOICE RECORDING & TRANSCRIPTION VIEW ── */
          <>
            <div className="flex flex-col items-center justify-center py-2 space-y-4">
              <div className="relative flex items-center justify-center">
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

                <div
                  className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                    state === 'listening'
                      ? 'bg-gradient-to-br from-cyan-400 to-purple-600 text-black shadow-cyan-500/40 ring-4 ring-cyan-400/30'
                      : state === 'completed'
                      ? 'bg-emerald-500 text-white shadow-emerald-500/40'
                      : state === 'no_speech' || state === 'error' || state === 'unsupported'
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {state === 'completed' ? (
                    <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9" />
                  ) : state === 'unsupported' || state === 'error' ? (
                    <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
                  ) : (
                    <Mic className={`w-7 h-7 sm:w-8 sm:h-8 ${state === 'listening' ? 'animate-pulse' : ''}`} />
                  )}
                </div>
              </div>

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
                    {errorMessage || 'No speech detected. Please speak closer to your microphone.'}
                  </p>
                )}
                {(state === 'unsupported' || state === 'error') && (
                  <div className="space-y-1 max-w-sm mx-auto">
                    <p className="text-xs sm:text-sm font-sans text-rose-300">
                      {errorMessage}
                    </p>
                    {errorCode && (
                      <p className="text-[10px] font-mono text-rose-400/80 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40 inline-block">
                        Code: {errorCode}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Live Real-Time Transcription Display Area */}
            <div
              ref={transcriptBoxRef}
              aria-live="polite"
              className={`rounded-2xl border p-4 min-h-[90px] max-h-[140px] overflow-y-auto transition-all text-left scrollbar-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [ms-overflow-style:none] ${
                state === 'completed'
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : hasContent
                  ? 'bg-black/40 border-cyan-500/30 shadow-inner'
                  : 'bg-white/[0.02] border-white/5'
              }`}
            >
              {hasContent ? (
                <p className="text-xs sm:text-sm text-slate-100 font-sans leading-relaxed whitespace-pre-wrap">
                  <span>{transcript}</span>
                  {interimText && (
                    <span className="text-cyan-300/90 italic font-mono">
                      {transcript ? ' ' : ''}
                      {interimText}
                      <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse" />
                    </span>
                  )}
                </p>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs font-mono">
                  {state === 'listening' ? '"Tell me about Zenemoo transcription services..."' : 'Voice transcript will appear here...'}
                </div>
              )}
            </div>

            {/* Action Buttons */}
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
                    const full = (accumulatedFinalRef.current + ' ' + interimText).trim();
                    cleanupEngine();
                    onTranscriptComplete(full);
                    onClose();
                  }}
                  className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-sans text-xs sm:text-sm font-extrabold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <span>Use Transcript Now →</span>
                </button>
              )}

              {(state === 'no_speech' || state === 'error') && (
                <div className="w-full flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const newSessionId = Date.now();
                      activeSessionIdRef.current = newSessionId;
                      initAndStartSession(newSessionId);
                    }}
                    className="flex-1 py-3 px-4 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-sans text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Try Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cleanupEngine();
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
                    cleanupEngine();
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/12 border border-white/10 text-slate-200 font-sans text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px]"
                >
                  Continue with Text Input
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

export default ZenemooVoiceModal;

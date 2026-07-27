import React, { useState } from 'react';
import { Terminal, Copy, Check, Send, Bot, Code, Cpu, ExternalLink } from 'lucide-react';

export const BotAndApi: React.FC = () => {
  const [activeLang, setActiveLang] = useState<'curl' | 'python' | 'node'>('python');
  const [copied, setCopied] = useState(false);

  const snippets = {
    python: `import httpx
import asyncio

API_BASE = "https://api.zenemo.tech/v1"
API_KEY = "zen_live_9f8a3721b04c8e19"

async function transcribe_audio(audio_path: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        with open(audio_path, "rb") as audio_file:
            response = await client.post(
                f"{API_BASE}/transcribe",
                headers={"Authorization": f"Bearer {API_KEY}"},
                files={"file": audio_file},
                data={"language": "Hindi", "verbatim": True}
            )
        data = response.json()
        print(f"Transcription Complete! Job ID: {data['job_id']} | Accuracy: {data['accuracy']}")
        return data["transcript_url"]

asyncio.run(transcribe_audio("speech_sample.wav"))`,

    curl: `curl -X POST "https://api.zenemo.tech/v1/transcribe" \\
  -H "Authorization: Bearer zen_live_9f8a3721b04c8e19" \\
  -F "file=@speech_sample.wav" \\
  -F "language=Hindi" \\
  -F "verbatim=true" \\
  -F "output_format=json"`,

    node: `import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const form = new FormData();
form.append('file', fs.createReadStream('speech_sample.wav'));
form.append('language', 'Hindi');

const res = await fetch('https://api.zenemo.tech/v1/transcribe', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer zen_live_9f8a3721b04c8e19',
    ...form.getHeaders()
  },
  body: form
});

const data = await res.json();
console.log('Transcript Output URL:', data.transcript_url);`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="bot-api" className="py-24 relative z-10 bg-[#06070a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono mb-4">
            <Terminal className="w-3.5 h-3.5" />
            ENTERPRISE DEVELOPER ECOSYSTEM
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Telegram Bot &amp; REST API SDK
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Integrate Zenemo Tech directly into your SaaS products, Telegram communities, or custom data workflows with zero setup friction.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Decoupled Telegram Bot Client Card */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-8 border border-white/10 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-[1px]">
                  <div className="w-full h-full bg-[#0a0c14] rounded-[15px] flex items-center justify-center">
                    <Bot className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
                  Telegram Client v22+
                </span>
              </div>

              <h3 className="text-2xl font-bold font-display text-white mb-2">Decoupled Telegram Bot</h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                High-performance bot client built with <span className="text-cyan-400 font-mono">python-telegram-bot v22+</span>. Operates 100% independently from the backend by issuing REST HTTP API calls.
              </p>

              {/* Bot Capabilities List */}
              <div className="space-y-3 font-mono text-xs text-slate-300 mb-8">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span>Instant /transcribe, /annotate, /voice Commands</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span>Async Job Queue Updates with Live Progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span>Automatic High-Res Audio &amp; Text File Payload Handling</span>
                </div>
              </div>
            </div>

            <a
              href="https://t.me/ZenemoTechBot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Launch @ZenemoTechBot on Telegram
            </a>
          </div>

          {/* Right: REST API Code Terminal */}
          <div className="lg:col-span-7 glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col justify-between">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                <span className="ml-2 font-mono text-xs text-slate-400">zenemo-tech-api-sdk-v1.py</span>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/10">
                {(['python', 'curl', 'node'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                      activeLang === lang
                        ? 'bg-cyan-500 text-black font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Snippet */}
            <div className="p-6 overflow-x-auto bg-black/80 font-mono text-xs leading-relaxed text-cyan-300 relative group min-h-[260px]">
              <button
                onClick={handleCopy}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <pre>
                <code>{snippets[activeLang]}</code>
              </pre>
            </div>

            {/* Terminal Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                FastAPI Swagger Spec Live
              </span>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Open API Docs (/docs)
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

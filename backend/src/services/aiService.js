import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase.js';
import { routeAiRequest } from './ai/aiRouter.js';
import { getFullHealthTelemetry } from './ai/providerHealth.js';
import { getAvailableProviders } from './ai/providerRegistry.js';

// Per-User Concurrency Protection
const activeUserRequests = new Set();

// Dynamic App Release Manifest Reader
export const getLatestAppManifest = () => {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), '../frontend/public/app/android-release.json'),
      path.resolve(process.cwd(), 'frontend/public/app/android-release.json'),
      path.resolve(process.cwd(), 'public/app/android-release.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('[AI Service App Manifest Reader Warn]:', e.message);
  }
  return {
    appName: 'Zenemoo',
    version: '2.0.5',
    packageName: 'in.zenemoo.app',
    downloadUrl: 'https://www.zenemoo.in/downloads/zenemoo-latest.apk',
    releaseDate: '2026-08-21',
    fileSize: '65.8 MB',
    releaseNotes: [
      'High-Volume Language Data Output Telemetry & Production Targets (500+ Mins Daily)',
      'Super QC multi-tier verification accuracy standards (99.9%+)',
    ],
  };
};

// In-Memory Telemetry & Analytics Store for Admin Dashboard
const aiTelemetry = {
  totalConversations: 142,
  totalMessages: 512,
  topicCounts: {
    'Audio Transcription': 148,
    'Odia Speech Data': 112,
    'DesiCrew Partnership': 89,
    'AI Data Annotation': 76,
    'Careers & Opportunities': 54,
    'Pricing & Quotes': 33,
    'General Information': 25,
  },
  unknownQuestions: [
    'Do you support German voice transcription?',
    'What is your ISO 27001 certificate number?',
  ],
  responseTimes: [240, 310, 190, 280, 220, 300],
  languageBreakdown: { English: 340, Hindi: 110, Odia: 62 },
};

// Static Verified Company Knowledge Base
const VERIFIED_COMPANY_KNOWLEDGE = `
[OFFICIAL ZENEMOO COMPANY KNOWLEDGE BASE — VERIFIED & CURRENT]

ORGANIZATION:
- Legal Name: Zenemoo (formerly QuantumCoders Data Solution)
- Founded: 2023
- Headquarters: K. Barida, Main Road, Odisha, India — PIN 761031
- Official Website: https://www.zenemoo.in/
- Industry: AI Data Services, Multilingual Speech Technology, Data Annotation
- Government Registration: MSME (Udyam) Registered Micro Enterprise (Ministry of MSME, Govt. of India)
- Registration Number: UDYAM-OD-11-0124893
- Major Activity: Services (AI & Data Technology)

KEY LEADERSHIP:
- Founder & Operations Manager: Prem Prasad Pradhan
  - Email: prem@zenemoo.in
  - Role: Manages daily operations, client relations, and technical quality assurance.

STRATEGIC ALLIANCE:
- Certified output partner for DesiCrew Solutions (DesiCrew.in) since 2023
- Delivers 100% verified language data output exclusively for DesiCrew enterprise clients
- Partnership scope: Audio transcription, regional speech datasets, voice annotation for South Asian languages

CORE AI SERVICES (6 offerings):
1. Multilingual Verbatim Audio Transcription — Timestamping, Speaker Diarization, Clean/Full Verbatim, SRT/WebVTT export
2. Odia & Regional Speech Data Collection & Annotation — Native speaker-curated Odia, Hindi, Indian English datasets
3. Audio Segmentation & Acoustic Model Data Formatting — For ASR (Automatic Speech Recognition) training
4. Multilingual Voice Over & Voice Dataset Creation — Professional multilingual voice recordings
5. LLM Evaluation & RLHF Dataset Annotation — Preference ranking, response quality evaluation for AI models
6. Computer Vision Image & Video Bounding Box Data Annotation — Object detection dataset creation

SUPPORTED LANGUAGES & CAPABILITIES:
- Zenemoo currently works across 23+ languages through a network of 50+ members across India.
- Major and regional languages supported include: Hindi, English, Odia (primary specialty), Gujarati, Bengali, Tamil, Marathi, Telugu, Urdu, Assamese, Maithili, Punjabi, Kashmiri, Sanskrit, Nepali, Bodo, Santali, Sindhi, Kannada, Manipuri, Malayalam, Konkani, and several other Indian regional languages.

PERFORMANCE METRICS (Verified Public Facts):
- Accuracy: 99.9%+ (Passes Super QC multi-stage review)
- Daily Production Output: 500+ audio minutes processed/day (10,000+ min/month)
- Team & Network Size: 50+ members (40 Transcribers + 10 QC Leads) across India
- Experience: 1.5+ Years (DesiCrew Partnership active since 2023)
- Quality Standard: Multi-stage Super QC before every client delivery

CONTACT INFORMATION:
- Sales & Inquiries: contact@zenemoo.in
- Technical Support: support@zenemoo.in
- General: info@zenemoo.in
- Phone / WhatsApp: +91 9827775230
- Headquarters Address: K. Barida, Main Road, Odisha, India — PIN 761031
- Operating Hours: Monday–Saturday, 09:00 AM – 07:00 PM IST
- Response Time: Under 2 hours during operating hours

PRICING MODEL:
- Custom enterprise quotes only — no public fixed pricing
- Factors: audio duration, language complexity, turnaround SLA, accuracy requirements
- To request a quote: Email contact@zenemoo.in or visit https://www.zenemoo.in/#contact

OFFICIAL MOBILE APPLICATION (ZENEMOO FOR ANDROID):
- Application Name: Zenemoo Official Android Application
- Package Identifier: in.zenemoo.app
- Compatibility: Android 8.0 (Oreo) and above (API 26 to Android 14/15)
- Architecture: Universal (ARM64, ARMv7, x86_64)
- Direct APK Download Link: https://www.zenemoo.in/downloads/zenemoo-latest.apk
- Official Android App Info Page: https://www.zenemoo.in/app/android (also accessible via https://www.zenemoo.in/app)

WEBSITE PAGES & PUBLIC NAVIGATION LINKS:
- Homepage: https://www.zenemoo.in/
- Official Android App Download Page: https://www.zenemoo.in/app/android
- Direct APK Download: https://www.zenemoo.in/downloads/zenemoo-latest.apk
- Join AI Data Network (Talent Registration): https://www.zenemoo.in/talent-registration
- Open Opportunities & Careers: https://www.zenemoo.in/opportunities
- Community & Client Reviews: https://www.zenemoo.in/review
- Published Team Directory: https://www.zenemoo.in/team-directory
- Zenemoo AI Assistant (Full Page): https://www.zenemoo.in/zenemooai
- AI Data Training & Datasets: https://www.zenemoo.in/ai-data
- Languages We Work In Section: https://www.zenemoo.in/#languages
- Core AI Services Section: https://www.zenemoo.in/#services
- DesiCrew Partnership Section: https://www.zenemoo.in/#partner
- Contact Us Section: https://www.zenemoo.in/#contact
- Privacy Policy: https://www.zenemoo.in/privacy
- Terms & Conditions: https://www.zenemoo.in/terms

CRITICAL PRIVACY & ANSWERING RULES:
1. PUBLIC CAPACITY FACTS ONLY: Always state Zenemoo works across "23+ languages with a network of 50+ members across India."
2. MOBILE APPLICATION QUESTIONS: Confirm that Zenemoo has an official Android mobile app available for direct download at https://www.zenemoo.in/app/android. Always reference the live release version injected below.
3. NEVER EXPOSE INTERNAL OPERATIONAL DATA: Never reveal candidate personal data, internal tracking codes, database IDs, or admin passwords.
4. LANGUAGE QUESTIONS: When asked if Zenemoo supports a specific language, confirm capability within our India-wide network.
5. NAVIGATION GUIDANCE: Provide exact public website links.
6. TEAM SIZE QUESTIONS: State "Zenemoo currently has a network of 50+ members (40 Transcribers + 10 QC Specialists) across India."
`;

// Dynamic RAG Context Builder
export const buildDynamicRAGContext = async (queryText = '') => {
  let context = VERIFIED_COMPANY_KNOWLEDGE;

  const manifest = getLatestAppManifest();
  context += `\n[LIVE RELEASE TELEMETRY: ZENEMOO ANDROID APPLICATION]
- App Name: ${manifest.appName}
- Live Release Version: ${manifest.version}
- Package Name: ${manifest.packageName}
- APK Download URL: ${manifest.downloadUrl}
- Release Date: ${manifest.releaseDate}
- File Size: ${manifest.fileSize}
- Release Notes Highlights: ${(manifest.releaseNotes || []).join('; ')}
`;

  try {
    if (/team|member|prem|who works|staff|contact/i.test(queryText)) {
      const { data: teamData } = await supabase
        .from('team_members')
        .select('name, designation, skills, bio')
        .limit(10);

      if (teamData && teamData.length > 0) {
        context += '\n[LIVE DATABASE: ZENEMOO TEAM MEMBERS]\n';
        teamData.forEach((m) => {
          context += `- ${m.name} (${m.designation}): ${m.bio || 'Specialist'} | Skills: ${
            Array.isArray(m.skills) ? m.skills.join(', ') : m.skills || 'AI Data'
          }\n`;
        });
      }
    }
  } catch (e) {
    console.warn('[RAG Database Lookup Skipped]:', e.message);
  }

  return context;
};

// System Prompt Builder
export const buildSystemPrompt = (ragContext, language = 'en', lengthMode = 'normal') => {
  let langInstruction = 'Respond in clear, professional English.';
  if (language === 'hi') {
    langInstruction = `MANDATORY LANGUAGE RULE: You MUST write your ENTIRE response in Hindi (हिन्दी / देवनागरी script).
Do NOT include any English paragraphs — only Hindi.
Emails, URLs, phone numbers, and numbers may stay in their original format.
Technical terms (e.g. AI Data Collection, Transcription, Voice Over, Zenemoo, Super QC) may remain in English script for clarity.`;
  } else if (language === 'or') {
    langInstruction = `MANDATORY LANGUAGE RULE: You MUST write your ENTIRE response in Odia (ଓଡ଼ିଆ script / ଓଡ଼ିଆ ଭାଷା).
Do NOT include any English paragraphs — only Odia script.
Emails, URLs, phone numbers, and numbers may stay in their original format.
Technical terms (e.g. AI Data Collection, Transcription, Voice Over, Zenemoo, Super QC) may remain in English script for clarity.`;
  }

  let lengthInstruction = 'Provide a clear, useful, complete answer in 2–4 short paragraphs or 3–6 bullet points.';
  if (lengthMode === 'short') {
    lengthInstruction = 'SHORT ANSWER MODE: Provide a concise, complete answer of 1–3 sentences or 3–5 short bullet points.';
  } else if (lengthMode === 'detailed') {
    lengthInstruction = 'DETAILED ANSWER MODE: Provide a comprehensive, complete answer with clear markdown headings, short paragraphs, and structured bullet points.';
  }

  const maxContextLength = language === 'or' ? 6000 : 8000;
  const truncatedContext = ragContext.length > maxContextLength
    ? ragContext.substring(0, maxContextLength) + '\n[Context truncated for length]'
    : ragContext;

  return `You are Zenemoo AI, the official enterprise AI assistant for Zenemoo (https://www.zenemoo.in/).

══════════════════════════════════════════════
STRICT OPERATING RULES:
══════════════════════════════════════════════

1. LANGUAGE: ${langInstruction}
2. ANSWER LENGTH: ${lengthInstruction}
3. GROUNDING: Answer ONLY using the verified knowledge base and database records below.
4. TONE: Professional, warm, enterprise-grade.
5. FORMATTING: Use **bold** for key terms, bullet points for lists, and clickable links.

══════════════════════════════════════════════
VERIFIED KNOWLEDGE BASE:
══════════════════════════════════════════════

${truncatedContext}`;
};

export const isIncompleteResponse = (text = '', finishReason = '') => {
  if (finishReason === 'length') return true;
  const trimmed = text.trim();
  if (trimmed.length < 20) return false;
  const lastChar = trimmed.slice(-1);
  return !/[\.\!\?\"\'\)\}\>\।]$/.test(lastChar);
};

// ─────────────────────────────────────────────────────────────
//  Main AI Execution Routine Delegated to Multi-Provider Router
// ─────────────────────────────────────────────────────────────
export const processAiChat = async (messages = [], language = 'en', lengthPreference = 'auto', userId = 'anonymous') => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Per-User Concurrency Protection
  if (activeUserRequests.has(userId)) {
    console.warn(`[Zenemoo AI] ${requestId} Concurrency protection active for user: ${userId}`);
    await new Promise((r) => setTimeout(r, 300));
  }
  activeUserRequests.add(userId);

  try {
    const lastUserMsg = messages.length > 0 ? messages[messages.length - 1].content || '' : '';
    const lowerMsg = lastUserMsg.toLowerCase();

    let lengthMode = lengthPreference;
    if (!lengthMode || lengthMode === 'auto') {
      const isShortQuery = /\b(short|brief|one line|small|shortly|সংକ୍ଷିପ୍ତ|संक्षिप्त)\b/i.test(lowerMsg);
      const isDetailedQuery = /\b(explain|details|full details|complete|how does it work|tell me everything|ବିସ୍ତୃତ|विस्तार|सब कुछ|ସମ୍ପୂର୍ଣ୍ଣ)\b/i.test(lowerMsg);

      if (isShortQuery) lengthMode = 'short';
      else if (isDetailedQuery) lengthMode = 'detailed';
      else lengthMode = 'normal';
    }

    const ragContext = await buildDynamicRAGContext(lastUserMsg);
    const systemMessage = { role: 'system', content: buildSystemPrompt(ragContext, language, lengthMode) };

    const historyLimit = language === 'or' ? 6 : 10;
    const fullMessages = [systemMessage, ...messages.slice(-historyLimit)];

    // Telemetry update
    aiTelemetry.totalMessages += 1;
    if (lowerMsg.includes('transcription') || lowerMsg.includes('audio')) aiTelemetry.topicCounts['Audio Transcription'] += 1;
    else if (lowerMsg.includes('odia') || lowerMsg.includes('language') || lowerMsg.includes('ଓଡ଼ିଆ')) aiTelemetry.topicCounts['Odia Speech Data'] += 1;
    else if (lowerMsg.includes('desicrew') || lowerMsg.includes('partner')) aiTelemetry.topicCounts['DesiCrew Partnership'] += 1;
    else if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('quote')) aiTelemetry.topicCounts['Pricing & Quotes'] += 1;
    else if (lowerMsg.includes('job') || lowerMsg.includes('career') || lowerMsg.includes('apply') || lowerMsg.includes('ଚାକିରି') || lowerMsg.includes('नौकरी')) aiTelemetry.topicCounts['Careers & Opportunities'] += 1;
    if (language === 'hi') aiTelemetry.languageBreakdown['Hindi'] += 1;
    else if (language === 'or') aiTelemetry.languageBreakdown['Odia'] += 1;
    else aiTelemetry.languageBreakdown['English'] += 1;

    const tokenLimit = lengthMode === 'short' ? 500 : lengthMode === 'detailed' ? 2500 : 1500;

    // Delegate to Multi-Provider Router (Groq -> Gemini -> Cerebras -> Mistral -> OpenRouter)
    const routerResult = await routeAiRequest({
      messages: fullMessages,
      maxTokens: tokenLimit,
      temperature: 0.25,
      requestId,
    });

    let finalReply = (routerResult.reply || '').trim();
    if (finalReply.length > 30 && !/[\.\!\?\"\'\)\}\>\।]$/.test(finalReply)) {
      if (/[:,\-–—…]$/.test(finalReply)) {
        finalReply = finalReply.substring(0, finalReply.length - 1).trim();
      }
      const endSymbol = language === 'or' || language === 'hi' ? '।' : '.';
      finalReply += endSymbol;
    }

    const totalDuration = Date.now() - startTime;
    aiTelemetry.responseTimes.push(totalDuration);
    if (aiTelemetry.responseTimes.length > 20) aiTelemetry.responseTimes.shift();

    return {
      reply: finalReply,
      durationMs: totalDuration,
      model: routerResult.modelUsed,
      provider: routerResult.providerName,
      providerId: routerResult.providerId,
    };
  } finally {
    activeUserRequests.delete(userId);
  }
};

// Health & Reliability Telemetry Exporter
export const getAiHealthTelemetry = () => {
  return getFullHealthTelemetry();
};

// Backend Automated AI Diagnostic Test Suite across Multi-Provider Pool
export const runAiDiagnosticTest = async (testCount = 10) => {
  const results = [];
  const testPrompts = [
    'What services does Zenemoo provide?',
    'Does Zenemoo have an official Android app?',
    'Tell me about the Odia speech data collection capabilities.',
    'What is the DesiCrew partnership?',
    'How can I request a quote for audio transcription?',
    'What is Zenemoo daily production output capacity?',
    'What regional languages does Zenemoo support?',
    'How do I apply for open opportunities at Zenemoo?',
    'Who is Prem Prasad Pradhan at Zenemoo?',
    'Where is Zenemoo headquarters located?',
  ];

  console.log(`[Multi-Provider AI Diagnostic Suite] Running ${testCount} health tests...`);

  for (let i = 0; i < Math.min(testCount, testPrompts.length); i++) {
    const prompt = testPrompts[i];
    const start = Date.now();
    try {
      const res = await processAiChat([{ role: 'user', content: prompt }], 'en', 'short', `diag_user_${i}`);
      const duration = Date.now() - start;
      results.push({
        testIndex: i + 1,
        prompt: prompt.substring(0, 35) + '...',
        success: true,
        provider: res.provider || res.providerId,
        model: res.model,
        durationMs: duration,
        replyPreview: (res.reply || '').substring(0, 50) + '...',
      });
    } catch (err) {
      const duration = Date.now() - start;
      results.push({
        testIndex: i + 1,
        prompt: prompt.substring(0, 35) + '...',
        success: false,
        error: err.message,
        durationMs: duration,
      });
    }
  }

  const telemetry = getAiHealthTelemetry();
  const configuredProviders = getAvailableProviders().map((p) => ({
    id: p.id,
    name: p.name,
    priority: p.priority,
    modelsCount: p.models.length,
  }));

  return {
    timestamp: new Date().toISOString(),
    testsRun: results.length,
    testsPassed: results.filter((r) => r.success).length,
    configuredProviders,
    testDetails: results,
    healthTelemetry: telemetry,
  };
};

// Admin AI Analytics Metrics
export const getAiAnalyticsMetrics = async () => {
  const avgLatency = Math.round(
    aiTelemetry.responseTimes.reduce((a, b) => a + b, 0) / (aiTelemetry.responseTimes.length || 1)
  );
  return {
    totalConversations: aiTelemetry.totalConversations,
    totalMessages: aiTelemetry.totalMessages,
    averageLatencyMs: avgLatency,
    topicCounts: aiTelemetry.topicCounts,
    unknownQuestions: aiTelemetry.unknownQuestions,
    languageBreakdown: aiTelemetry.languageBreakdown,
    status: 'ACTIVE',
    configuredProviders: getAvailableProviders().map((p) => p.name),
    healthTelemetry: getAiHealthTelemetry(),
    lastSyncAt: new Date().toISOString(),
  };
};

// AI Team Member Executive Summary Generator
export const generateTeamMemberSummary = async (member = {}) => {
  const fallbackSummary = `${member.name || 'Team Member'} is a dedicated ${member.designation || member.role || 'Data & AI Specialist'} at Zenemoo specializing in ${
    Array.isArray(member.skills) ? member.skills.join(', ') : member.skills || 'AI data quality & annotation'
  }. ${member.bio || 'Delivering enterprise-grade precision for global AI data workflows.'}`;

  try {
    const prompt = `Write a professional, impressive, 2-3 sentence executive summary highlighting key strengths for this Zenemoo AI team member.

Member Name: ${member.name || 'Specialist'}
Designation: ${member.designation || member.role || 'Specialist'}
Department: ${member.department || member.category || 'Engineering'}
Key Skills: ${Array.isArray(member.skills) ? member.skills.join(', ') : member.skills || 'AI Annotation, Quality Assurance'}
Bio: ${member.bio || 'Experienced AI data & audio transcription lead'}

Rule: Output ONLY the concise 2-3 sentence summary paragraph without titles or quotes.`;

    const res = await routeAiRequest({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 250,
      temperature: 0.3,
      requestId: 'team_summary_gen',
    });

    const summary = (res.reply || '').trim();
    return summary || fallbackSummary;
  } catch (err) {
    return fallbackSummary;
  }
};

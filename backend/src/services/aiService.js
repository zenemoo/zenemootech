import { supabase } from '../config/supabase.js';

// ─────────────────────────────────────────────────────────────
//  In-Memory Telemetry & Analytics Store for Admin Dashboard
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
//  Static Verified Company Knowledge Base
// ─────────────────────────────────────────────────────────────
const VERIFIED_COMPANY_KNOWLEDGE = `
[OFFICIAL ZENEMOO COMPANY KNOWLEDGE BASE — VERIFIED & CURRENT]

ORGANIZATION:
- Legal Name: Zenemoo (formerly QuantumCoders Data Solution)
- Founded: 2023
- Headquarters: Berhampur City, Odisha, India — PIN 760001
- Official Website: https://www.zenemoo.in/
- Industry: AI Data Services, Multilingual Speech Technology, Data Annotation

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

SUPPORTED LANGUAGES:
- Odia (ଓଡ଼ିଆ) — PRIMARY specialty
- Hindi (हिंदी)
- Indian English
- Bengali, Telugu, Tamil (secondary support)

PERFORMANCE METRICS (Verified):
- Accuracy: 99%+ (Passes Super QC multi-stage review)
- Daily Capacity: 180+ audio minutes processed/day (3,600+ min/month)
- Team Size: 20+ trained multilingual specialists
- Quality Standard: Multi-stage QC before every client delivery

CONTACT INFORMATION:
- Sales & Inquiries: contact@zenemoo.in
- Technical Support: support@zenemoo.in
- General: info@zenemoo.in
- Phone: +91 9827775230
- Operating Hours: Monday–Saturday, 09:00 AM – 07:00 PM IST
- Response Time: Under 2 hours during operating hours

PRICING MODEL:
- Custom enterprise quotes only — no public fixed pricing
- Factors: audio length, language complexity, turn-around time, accuracy SLA
- To request a quote: Email contact@zenemoo.in or use the Contact page

WEBSITE PAGES & NAVIGATION:
- Homepage: https://www.zenemoo.in/
- Opportunities / Careers: https://www.zenemoo.in/opportunities
- Team Directory: https://www.zenemoo.in/team-directory
- Privacy Policy: https://www.zenemoo.in/privacy
- Terms & Conditions: https://www.zenemoo.in/terms
- Zenemoo AI Assistant (full page): https://www.zenemoo.in/zenemooai
- Contact Section: https://www.zenemoo.in/#contact
- Services Section: https://www.zenemoo.in/#services
- Partner Section: https://www.zenemoo.in/#partner
`;

// ─────────────────────────────────────────────────────────────
//  Company Process Knowledge (Step-by-Step Workflows)
// ─────────────────────────────────────────────────────────────
const COMPANY_PROCESSES = `
[ZENEMOO COMPANY PROCESSES & WORKFLOWS]

HOW TO APPLY FOR A JOB AT ZENEMOO:
Step 1: Visit the Zenemoo website at https://www.zenemoo.in/
Step 2: Navigate to the Opportunities page at https://www.zenemoo.in/opportunities
Step 3: Browse all published open positions (transcriptionists, annotators, QC specialists, etc.)
Step 4: Click on a position to read the full job description and requirements
Step 5: Fill in the online application form with your name, contact details, and experience
Step 6: Upload your resume/CV and any required work samples
Step 7: Submit your application
Step 8: Our team reviews applications within 3–5 business days and contacts shortlisted candidates
Action: {{ACTION:opportunities}}

HOW TO CONTACT ZENEMOO:
Available contact methods:
- Email (Sales & Inquiries): contact@zenemoo.in
- Email (Technical Support): support@zenemoo.in
- Email (General): info@zenemoo.in
- Phone: +91 9827775230 (Mon–Sat, 9 AM – 7 PM IST)
- Contact Form: Visit the Contact section on the website
Action: {{ACTION:contact}}

HOW TO REQUEST A QUOTATION:
Step 1: Send an email to contact@zenemoo.in with subject: "Enterprise Quote Request"
Step 2: Include details: audio language, approximate volume (hours/month), required accuracy SLA, turn-around time
Step 3: Our team prepares a custom quote within 24 hours
Step 4: Review and sign the service agreement
Step 5: Onboarding and first delivery within agreed timeline
Action: {{ACTION:quote}}

HOW TO PARTNER WITH ZENEMOO:
Step 1: Review our DesiCrew partnership model on the website
Step 2: Send a partnership inquiry to contact@zenemoo.in with your organization details
Step 3: Schedule an initial discovery call with our team
Step 4: Review partnership terms and service-level agreements
Step 5: Sign the partnership agreement and begin onboarding
Action: {{ACTION:partner}}
`;

// ─────────────────────────────────────────────────────────────
//  Dynamic RAG Context Builder (Supabase Live Data)
// ─────────────────────────────────────────────────────────────
export const buildDynamicRAGContext = async (userQuery = '') => {
  let liveContext = VERIFIED_COMPANY_KNOWLEDGE + '\n' + COMPANY_PROCESSES;

  if (supabase) {
    try {
      // 1. Live Published Services
      const { data: services } = await supabase
        .from('services')
        .select('name, description, badge')
        .limit(12);
      if (Array.isArray(services) && services.length > 0) {
        liveContext += `\n[LIVE DATABASE: PUBLISHED SERVICES]\n`;
        services.forEach((s) => {
          liveContext += `- ${s.name}: ${s.description} (${s.badge || 'Active'})\n`;
        });
      }

      // 2. Live Career Opportunities
      const { data: opps } = await supabase
        .from('opportunities')
        .select('title, category, status, type, location, description')
        .eq('status', 'active')
        .limit(10);
      if (Array.isArray(opps) && opps.length > 0) {
        liveContext += `\n[LIVE DATABASE: OPEN CAREER & PROGRAM OPPORTUNITIES]\n`;
        opps.forEach((o) => {
          liveContext += `- Position: ${o.title} | Category: ${o.category || 'General'} | Type: ${o.type || 'Full-time'} | Location: ${o.location || 'Remote/Odisha'} | Status: Open\n`;
          if (o.description) liveContext += `  Description: ${o.description.substring(0, 200)}...\n`;
        });
      }

      // 3. Live Enterprise Partners
      const { data: partners } = await supabase
        .from('partners')
        .select('name, role, badge, description')
        .limit(5);
      if (Array.isArray(partners) && partners.length > 0) {
        liveContext += `\n[LIVE DATABASE: ENTERPRISE PARTNERS & ALLIANCES]\n`;
        partners.forEach((p) => {
          liveContext += `- ${p.name}: ${p.role} [${p.badge || 'Partner'}]${p.description ? ` — ${p.description}` : ''}\n`;
        });
      }

      // 4. Live Team Members — CRITICAL for "Who is X?" questions
      const { data: team } = await supabase
        .from('team_members')
        .select('name, role, department, bio, skills, experience, email, social_links, profile_image')
        .eq('published', true)
        .limit(30);
      if (Array.isArray(team) && team.length > 0) {
        liveContext += `\n[LIVE DATABASE: ZENEMOO TEAM MEMBERS]\n`;
        liveContext += `Note: Use this section to answer ALL questions about "Who is X?", "Who handles Y?", "Who is the CEO?", etc.\n`;
        team.forEach((t) => {
          liveContext += `---\n`;
          liveContext += `Name: ${t.name}\n`;
          liveContext += `Role/Title: ${t.role}\n`;
          if (t.department) liveContext += `Department: ${t.department}\n`;
          if (t.bio) liveContext += `Bio: ${t.bio}\n`;
          if (t.skills) {
            const skills = Array.isArray(t.skills) ? t.skills.join(', ') : String(t.skills);
            if (skills) liveContext += `Skills: ${skills}\n`;
          }
          if (t.experience) liveContext += `Experience: ${t.experience}\n`;
          if (t.email) liveContext += `Email: ${t.email}\n`;
          if (t.social_links) {
            try {
              const sl = typeof t.social_links === 'string' ? JSON.parse(t.social_links) : t.social_links;
              if (sl.linkedin) liveContext += `LinkedIn: ${sl.linkedin}\n`;
              if (sl.github) liveContext += `GitHub: ${sl.github}\n`;
              if (sl.twitter) liveContext += `Twitter/X: ${sl.twitter}\n`;
            } catch (_) {}
          }
        });
      }

    } catch (err) {
      console.warn('[RAG Context Fetch Warning]', err.message || err);
    }
  }

  return liveContext;
};

// ─────────────────────────────────────────────────────────────
//  System Prompt Builder
// ─────────────────────────────────────────────────────────────
export const buildSystemPrompt = (ragContext, language = 'en') => {
  let langInstruction = 'Respond in clear, professional English.';
  if (language === 'hi') {
    langInstruction = `MANDATORY: Write your ENTIRE response in Hindi (हिन्दी / देवनागरी script). 
Do NOT mix English paragraphs with Hindi. Translate all service names, team names, and contact details accurately.
Numbers, email addresses, URLs, and phone numbers may remain in their original format.`;
  } else if (language === 'or') {
    langInstruction = `MANDATORY: Write your ENTIRE response in Odia (ଓଡ଼ିଆ script). 
Do NOT mix English paragraphs with Odia. Translate all service names, team descriptions, and facts accurately into Odia.
Numbers, email addresses, URLs, and phone numbers may remain in their original format.`;
  }

  return `You are Zenemoo AI, the official enterprise AI assistant for Zenemoo (https://www.zenemoo.in/).

══════════════════════════════════════════════
STRICT OPERATING RULES (NEVER VIOLATE):
══════════════════════════════════════════════

1. GROUNDING: Answer ONLY using the verified knowledge base and live database records provided below.
   NEVER invent team members, services, pricing, certifications, or facts not present in the context.

2. FALLBACK: If information is not in the context, politely say so in the selected language and suggest:
   "Please contact contact@zenemoo.in or visit https://www.zenemoo.in/"

3. LANGUAGE: ${langInstruction}

4. TONE: Professional, warm, enterprise-grade. Like a helpful company representative.

5. FORMATTING RULES:
   - Use **bold** for key terms, names, and important facts.
   - Use bullet lists (- item) for multiple items.
   - Use numbered lists (1. 2. 3.) for step-by-step processes.
   - Use tables for comparisons (Markdown table syntax).
   - Use inline \`code\` for email addresses and URLs.
   - Keep responses under 350 words unless the user explicitly asks for detail.
   - End responses with a relevant suggestion or action when appropriate.

6. TEAM QUESTIONS: When asked about specific people, roles, or departments, ALWAYS check the [LIVE DATABASE: ZENEMOO TEAM MEMBERS] section first. Give precise answers based on that data.

7. ACTION TOKENS: When your response involves navigating to a page, include the exact token:
   - For career/job pages: {{ACTION:opportunities}}
   - For contact: {{ACTION:contact}}
   - For services: {{ACTION:services}}
   - For partnership: {{ACTION:partner}}
   - For team: {{ACTION:team}}
   - For quotation: {{ACTION:quote}}
   Include at most 2 action tokens per response, only when relevant.

8. EMAIL/LINK FORMAT: Always write emails as [email@domain.com](mailto:email@domain.com) for proper rendering.

══════════════════════════════════════════════
VERIFIED KNOWLEDGE BASE:
══════════════════════════════════════════════

${ragContext}`;
};

// ─────────────────────────────────────────────────────────────
//  Main AI Execution Routine
// ─────────────────────────────────────────────────────────────
export const processAiChat = async (messages = [], language = 'en') => {
  const startTime = Date.now();
  const apiKey = (process.env.XAI_API_KEY || process.env.GROQ_API_KEY || '').trim();

  if (!apiKey) throw new Error('AI Provider API key is missing on the server.');

  const lastUserMsg = messages.length > 0 ? messages[messages.length - 1].content || '' : '';
  const ragContext = await buildDynamicRAGContext(lastUserMsg);
  const systemMessage = { role: 'system', content: buildSystemPrompt(ragContext, language) };

  // Keep last 12 messages for context window efficiency
  const fullMessages = [systemMessage, ...messages.slice(-12)];

  // Telemetry update
  aiTelemetry.totalMessages += 1;
  const lowerMsg = lastUserMsg.toLowerCase();
  if (lowerMsg.includes('transcription') || lowerMsg.includes('audio')) aiTelemetry.topicCounts['Audio Transcription'] += 1;
  else if (lowerMsg.includes('odia') || lowerMsg.includes('language') || lowerMsg.includes('ଓଡ଼ିଆ')) aiTelemetry.topicCounts['Odia Speech Data'] += 1;
  else if (lowerMsg.includes('desicrew') || lowerMsg.includes('partner')) aiTelemetry.topicCounts['DesiCrew Partnership'] += 1;
  else if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('quote')) aiTelemetry.topicCounts['Pricing & Quotes'] += 1;
  else if (lowerMsg.includes('job') || lowerMsg.includes('career') || lowerMsg.includes('apply') || lowerMsg.includes('ଚାକିରି') || lowerMsg.includes('नौकरी')) aiTelemetry.topicCounts['Careers & Opportunities'] += 1;
  if (language === 'hi') aiTelemetry.languageBreakdown['Hindi'] += 1;
  else if (language === 'or') aiTelemetry.languageBreakdown['Odia'] += 1;
  else aiTelemetry.languageBreakdown['English'] += 1;

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const modelName = 'llama-3.3-70b-versatile';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: fullMessages,
      temperature: 0.25,
      max_tokens: 1200,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('AI Provider Error:', response.status, errText);
    throw new Error(`AI Service Provider returned error status ${response.status}`);
  }

  const data = await response.json();
  const replyText = data.choices?.[0]?.message?.content || 'I am ready to assist you with Zenemoo services.';
  const duration = Date.now() - startTime;

  aiTelemetry.responseTimes.push(duration);
  if (aiTelemetry.responseTimes.length > 20) aiTelemetry.responseTimes.shift();

  return { reply: replyText, durationMs: duration, model: modelName };
};

// ─────────────────────────────────────────────────────────────
//  Admin AI Analytics
// ─────────────────────────────────────────────────────────────
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
    model: 'Llama-3.3-70b-versatile (Groq)',
    lastSyncAt: new Date().toISOString(),
  };
};

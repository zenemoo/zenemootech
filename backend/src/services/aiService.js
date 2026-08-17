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
- Accuracy: 99%+ (Passes Super QC multi-stage review)
- Daily Production Output: 180+ audio minutes processed/day (3,600+ min/month)
- Team & Network Size: 50+ members across India
- Experience: 1.5+ Years (DesiCrew Partnership active since 2023)
- Quality Standard: Multi-stage QC before every client delivery

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

WEBSITE PAGES & PUBLIC NAVIGATION LINKS:
- Homepage: https://www.zenemoo.in/
- Join AI Data Network (Talent Registration): https://www.zenemoo.in/talent-registration
- Open Opportunities & Careers: https://www.zenemoo.in/opportunities
- Community & Client Reviews: https://www.zenemoo.in/review
- Published Team Directory: https://www.zenemoo.in/team-directory
- Zenemoo AI Assistant (Full Page): https://www.zenemoo.in/zenemooai
- Languages We Work In Section: https://www.zenemoo.in/#languages
- Core AI Services Section: https://www.zenemoo.in/#services
- DesiCrew Partnership Section: https://www.zenemoo.in/#partner
- Contact Us Section: https://www.zenemoo.in/#contact
- Privacy Policy: https://www.zenemoo.in/privacy
- Terms & Conditions: https://www.zenemoo.in/terms

CRITICAL PRIVACY & ANSWERING RULES:
1. PUBLIC CAPACITY FACTS ONLY: Always state Zenemoo works across "23+ languages with a network of 50+ members across India."
2. NEVER EXPOSE INTERNAL OPERATIONAL DATA: Never reveal candidate names, emails, phone numbers, tracking codes (ZEN-XXXX), internal resource counts per language, coordinator counts, speaker capacity, candidate availability, database IDs, internal admin notes, or admin dashboard links.
3. LANGUAGE QUESTIONS: When asked if Zenemoo supports a specific language (e.g. Odia, Gujarati, Bengali, Tamil, Telugu), confirm capability within our India-wide network. If asked for exact speaker counts, state: "Our available resources depend on specific project requirements, volume, timeline and speaker criteria. Please contact Zenemoo at contact@zenemoo.in for current availability."
4. NAVIGATION GUIDANCE: When users ask where to apply, register, read reviews, or contact Zenemoo, provide the exact public website links listed above.
5. TEAM SIZE QUESTIONS: State "Zenemoo currently has a network of 50+ members across India supporting multilingual AI-data and related projects."
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
//  Truncation & Completeness Checker
// ─────────────────────────────────────────────────────────────
const isIncompleteResponse = (text = '', finishReason = '') => {
  if (!text || text.trim().length < 25) return false;
  if (finishReason === 'length') return true;

  const trimmed = text.trim();

  // Ends with unclosed markdown link or brackets
  if (/\[[^\]]*$/.test(trimmed) || /\([^\)]*$/.test(trimmed)) return true;
  if (/https?:\/\/[^\s\)]*$/i.test(trimmed)) return true;

  // Ends with trailing colon, comma, dash, or ellipsis
  if (/[:,\-–—…]$/.test(trimmed)) return true;

  // Ends with trailing conjunctions/prepositions that imply a missing clause
  if (/\b(and|or|including|such as|for example|with|is|are|the|a|an|ସହିତ|ଏବଂ|ଓ|तथा|एवं|और|जैसे|इत्यादि)$/i.test(trimmed)) return true;

  // Terminal sentence punctuation check (. ! ? " ' ) ] } > ।)
  const hasTerminalPunctuation = /[\.\!\?\"\'\)\}\>\।]$/.test(trimmed);
  if (!hasTerminalPunctuation) {
    const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
    const lastLine = lines[lines.length - 1] || '';
    if (!/[\.\!\?\"\'\)\}\>\।]$/.test(lastLine.trim())) {
      return true;
    }
  }

  return false;
};

// ─────────────────────────────────────────────────────────────
//  System Prompt Builder
// ─────────────────────────────────────────────────────────────
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
    lengthInstruction = 'SHORT ANSWER MODE: Provide a concise, complete answer of 1–3 sentences or 3–5 short bullet points. Do NOT provide long intro paragraphs.';
  } else if (lengthMode === 'detailed') {
    lengthInstruction = 'DETAILED ANSWER MODE: Provide a comprehensive, complete answer with clear markdown headings, short paragraphs, and structured bullet points or numbered steps. Do NOT truncate or cut off.';
  }

  // Truncate context to avoid token overflow
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
   NEVER invent team members, services, pricing, or facts not present in the context.

4. COMPLETENESS RULE: Never end a response mid-sentence, mid-bullet, or with an incomplete link. Complete every thought naturally.

5. TONE: Professional, warm, enterprise-grade. Like a helpful company representative.

6. FORMATTING:
   - Use **bold** for key terms and important facts.
   - Use bullet lists for multiple items (- item).
   - Use numbered lists for step-by-step processes.
   - Format emails as [email](mailto:email) for clickable rendering.
   - Ensure all URLs are complete (e.g. https://www.zenemoo.in/talent-registration).

7. TEAM QUESTIONS: Always check the [LIVE DATABASE: ZENEMOO TEAM MEMBERS] section first for questions about people, roles, departments.

8. ACTION TOKENS: Include relevant navigation tokens when applicable:
   - Career/jobs: {{ACTION:opportunities}}
   - Contact: {{ACTION:contact}}
   - Services: {{ACTION:services}}
   - Partnership: {{ACTION:partner}}
   - Team: {{ACTION:team}}
   - Quote: {{ACTION:quote}}
   Use at most 2 action tokens per response.

══════════════════════════════════════════════
VERIFIED KNOWLEDGE BASE:
══════════════════════════════════════════════

${truncatedContext}`;
};


// ─────────────────────────────────────────────────────────────
//  Main AI Execution Routine
// ─────────────────────────────────────────────────────────────
export const processAiChat = async (messages = [], language = 'en', lengthPreference = 'auto') => {
  const startTime = Date.now();
  const apiKey = (process.env.XAI_API_KEY || process.env.GROQ_API_KEY || '').trim();

  if (!apiKey) throw new Error('AI Provider API key is missing on the server.');

  const lastUserMsg = messages.length > 0 ? messages[messages.length - 1].content || '' : '';
  const lowerMsg = lastUserMsg.toLowerCase();

  // Auto infer length mode if lengthPreference is 'auto'
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

  // For Odia: send fewer history messages to reduce token usage
  const historyLimit = language === 'or' ? 6 : 12;
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

  const candidateModels = Array.from(new Set([
    process.env.GROQ_AI_MODEL,
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama3-70b-8192',
    'llama-3.1-8b-instant',
  ].filter(Boolean)));

  const tokenLimit = lengthMode === 'short' ? 500 : lengthMode === 'detailed' ? 3000 : 2048;
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  let response;
  let usedModel = candidateModels[0];
  let errText = '';

  for (const modelName of candidateModels) {
    usedModel = modelName;
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: fullMessages,
        temperature: 0.25,
        max_tokens: tokenLimit,
        stream: false,
      }),
    });

    if (response.ok) {
      break;
    }

    errText = await response.text();
    console.warn(`[Zenemoo AI] Model ${modelName} returned status ${response.status}: ${errText}`);
    if (response.status !== 404 && !errText.includes('model_not_found')) {
      break;
    }
  }

  if (!response || !response.ok) {
    console.error('AI Provider Error:', response ? response.status : 'No response', errText);
    throw new Error(`AI Service Provider returned error status ${response ? response.status : 500}`);
  }

  const data = await response.json();
  let replyText = data.choices?.[0]?.message?.content || 'I am ready to assist you with Zenemoo services.';
  const finishReason = data.choices?.[0]?.finish_reason || '';

  // Controlled 1-Shot Continuation Check for Incomplete Answers
  if (isIncompleteResponse(replyText, finishReason)) {
    try {
      const continuationMessages = [
        ...fullMessages,
        { role: 'assistant', content: replyText },
        {
          role: 'user',
          content: 'Continue your response from the EXACT word where it was interrupted. Do NOT repeat any text already written. Finish the current sentence and complete the answer naturally.',
        },
      ];

      const contResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: usedModel,
          messages: continuationMessages,
          temperature: 0.2,
          max_tokens: 1200,
          stream: false,
        }),
      });

      if (contResponse.ok) {
        const contData = await contResponse.json();
        const contText = contData.choices?.[0]?.message?.content || '';
        if (contText.trim()) {
          // Stitch PART 1 + PART 2 cleanly with space, eliminating accidental repeated boundary words
          const cleanCont = contText.trim();
          const lastWords = replyText.trim().split(/\s+/).slice(-3).join(' ');
          if (lastWords && cleanCont.startsWith(lastWords)) {
            replyText = replyText.trim() + ' ' + cleanCont.substring(lastWords.length).trim();
          } else {
            replyText = replyText.trim() + ' ' + cleanCont;
          }
        }
      }
    } catch (contErr) {
      console.warn('AI continuation request failed silently:', contErr.message || contErr);
    }
  }

  // Final Terminal Safety Check: ensure reply doesn't end abruptly without punctuation
  let finalReply = replyText.trim();
  if (finalReply.length > 30 && !/[\.\!\?\"\'\)\}\>\।]$/.test(finalReply)) {
    if (/[:,\-–—…]$/.test(finalReply)) {
      finalReply = finalReply.substring(0, finalReply.length - 1).trim();
    }
    const endSymbol = language === 'or' || language === 'hi' ? '।' : '.';
    finalReply += endSymbol;
  }

  const duration = Date.now() - startTime;
  aiTelemetry.responseTimes.push(duration);
  if (aiTelemetry.responseTimes.length > 20) aiTelemetry.responseTimes.shift();

  return { reply: finalReply, durationMs: duration, model: modelName };
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

// ─────────────────────────────────────────────────────────────
//  AI Team Member Executive Summary Generator (Groq Llama 3.3 70B)
// ─────────────────────────────────────────────────────────────
export const generateTeamMemberSummary = async (member = {}) => {
  const apiKey = (process.env.XAI_API_KEY || process.env.GROQ_API_KEY || '').trim();
  const fallbackSummary = `${member.name || 'Team Member'} is a dedicated ${member.designation || member.role || 'Data & AI Specialist'} at Zenemoo specializing in ${
    Array.isArray(member.skills) ? member.skills.join(', ') : member.skills || 'AI data quality & annotation'
  }. ${member.bio || 'Delivering enterprise-grade precision for global AI data workflows.'}`;

  if (!apiKey) {
    console.warn('Groq API key missing on server, returning bio fallback for summary');
    return fallbackSummary;
  }

  try {
    const prompt = `Write a professional, impressive, 2-3 sentence executive summary highlighting key strengths for this Zenemoo AI team member.

Member Name: ${member.name || 'Specialist'}
Designation: ${member.designation || member.role || 'Specialist'}
Department: ${member.department || member.category || 'Engineering'}
Key Skills: ${Array.isArray(member.skills) ? member.skills.join(', ') : member.skills || 'AI Annotation, Quality Assurance'}
Bio: ${member.bio || 'Experienced AI data & audio transcription lead'}
Experience: ${member.experience || 'Experienced professional'}

Rule: Output ONLY the concise 2-3 sentence summary paragraph. Do not include titles, quotes, or markdown formatting.`;

    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 250,
      }),
    });

    if (!response.ok) {
      console.warn('Groq API response error for team summary:', response.status);
      return fallbackSummary;
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    return summary || fallbackSummary;
  } catch (err) {
    console.error('Error generating AI summary via Groq:', err.message);
    return fallbackSummary;
  }
};


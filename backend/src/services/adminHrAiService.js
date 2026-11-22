import fetch from 'node-fetch';

/**
 * System Prompt for Zenemoo Admin & HR AI
 */
const ADMIN_HR_SYSTEM_PROMPT = `You are "Zenemoo Admin & HR AI", the private internal communication assistant for Zenemoo (https://www.zenemoo.in/).
Your primary responsibility is to help Zenemoo's Admin team, HR team, project coordinators, and management turn rough notes, instructions, or queries into polished, professional, ready-to-send business communication.

══════════════════════════════════════════════
OPERATING PRINCIPLES & BRAIN INSTRUCTIONS:
══════════════════════════════════════════════

1. ROLE & IDENTITY:
   - Think like a Senior HR Manager + Business Communication Specialist + Project Coordinator + Recruitment Lead + Vendor Relationship Manager.
   - Tone must be professional, clear, polite, direct, and human-sounding.
   - NEVER start responses with fluff like "Certainly! I'd be happy to help with that..." Just deliver the ready-to-send message directly.

2. FORMAT DISTINCTION:
   - EMAIL: Must include a clear Subject line, professional greeting (e.g. "Dear [Name]," or "Hello [Name],"), well-structured body paragraphs, polite sign-off, and signature placeholder (e.g. "Best regards,\n[Your Name]\nZenemoo").
   - WHATSAPP / TELEGRAM / LINKEDIN: Must be concise, natural, direct, and easy to read on mobile. Avoid long corporate email intros. Use clean line breaks.

3. PRESERVE USER INTENT & NUMBERS:
   - NEVER alter user quantities (e.g. if user says 50 Odia speakers, keep 50).
   - NEVER alter user dates, timelines, languages, or specific constraints.
   - You may fix broken grammar, poor spelling, and informal phrasing, but NEVER change the underlying meaning.

4. PLACEHOLDER SYSTEM:
   - If key information is missing (e.g. client name, deadline, date, project name, payment amount), use clear visual bracket placeholders:
     [Client Name], [Candidate Name], [Vendor Name], [Project Name], [Deadline Date], [Amount], [Language], [Quantity], [Your Name]
   - NEVER invent fake personal names, prices, or client commitments.

5. ZENEMOO APPROVED COMPANY CONTEXT:
   - Company: Zenemoo (AI Data & Multilingual Solutions)
   - Public Capabilities: 23+ Languages with native speakers across India, 50+ Team Members.
   - Services: Audio Transcription, Odia & Regional Speech Datasets, Multilingual Data Collection, Voice Over, Computer Vision & Video Annotation, LLM Evaluation & RLHF Data.
   - Website: https://www.zenemoo.in/
   - Contact: contact@zenemoo.in | +91 9827775230

6. MULTILINGUAL COMMUNICATION:
   - Default response language is English unless Hindi, Odia, or another language is requested.
   - When requested in Hindi or Odia, write natural professional sentences in Hindi (हिंदी) or Odia (ଓଡ଼ିଆ) script, keeping technical terms (AI Data Collection, Zenemoo, Transcription) in English where clearest.
`;

/**
 * Generate communication message (Email, WhatsApp, HR, Client, Vendor, Candidate)
 */
export const generateAdminHrCommunication = async ({
  category = 'email', // email, whatsapp, hr, client, vendor, candidate, general
  recipientType = 'general', // client, vendor, employee, candidate, manager, partner, general
  purpose = 'general',
  userPrompt = '',
  tone = 'professional', // professional, friendly, formal, polite, firm, urgent
  length = 'normal', // short, normal, detailed
  language = 'en', // en, hi, or
  signature = null,
}) => {
  const apiKey = (
    process.env.ADMIN_HR_GROQ_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.XAI_API_KEY ||
    ''
  ).trim();

  if (!apiKey) {
    throw new Error('Server API key for Admin & HR AI is missing.');
  }

  const candidateModels = Array.from(new Set([
    process.env.ADMIN_HR_AI_MODEL,
    process.env.GROQ_AI_MODEL,
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama3-70b-8192',
    'llama-3.1-8b-instant',
  ].filter(Boolean)));

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  // Construct specific task prompt
  let formatDesc = 'EMAIL';
  if (category === 'whatsapp' || category === 'telegram' || category === 'linkedin') {
    formatDesc = `${category.toUpperCase()} MESSAGE`;
  } else if (category === 'hr') {
    formatDesc = 'OFFICIAL HR COMMUNICATION';
  } else if (category === 'client') {
    formatDesc = 'ENTERPRISE CLIENT COMMUNICATION';
  } else if (category === 'vendor') {
    formatDesc = 'VENDOR / DATA PARTNER COMMUNICATION';
  } else if (category === 'candidate') {
    formatDesc = 'CANDIDATE / PARTICIPANT RECRUITMENT MESSAGE';
  }

  let sigText = '';
  if (signature && typeof signature === 'object') {
    sigText = `\nDefault Sender Signature:\n${signature.name || '[Your Name]'}\n${signature.designation || '[Designation]'}\n${signature.company || 'Zenemoo'}\n${signature.email ? `Email: ${signature.email}` : ''}\n${signature.phone ? `Phone: ${signature.phone}` : ''}\n${signature.website || 'www.zenemoo.in'}`;
  }

  const taskInstruction = `
Format Required: ${formatDesc}
Recipient Type: ${recipientType}
Specific Purpose: ${purpose}
Selected Tone: ${tone}
Target Length Mode: ${length}
Target Response Language: ${language === 'hi' ? 'Hindi (हिंदी)' : language === 'or' ? 'Odia (ଓଡ଼ିଆ)' : 'English'}
${sigText}

User's Raw Instruction / Notes:
"${userPrompt}"

INSTRUCTIONS:
1. Generate a complete, polished ${formatDesc}.
2. For Email format: Include a "Subject: ..." line at the top, followed by Greeting, Body, Closing, and Signature.
3. For WhatsApp/Short message format: Do NOT include a subject line. Start directly with a brief greeting or message body.
4. Use clear bracket placeholders (e.g. [Client Name], [Deadline]) for any missing details.
5. Deliver ONLY the final ready-to-send content. Do NOT add meta commentary.
`;

  let response;
  let usedModel = candidateModels[0];
  let errBody = '';

  for (const modelName of candidateModels) {
    usedModel = modelName;
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: ADMIN_HR_SYSTEM_PROMPT },
          { role: 'user', content: taskInstruction },
        ],
        temperature: 0.2,
        max_tokens: length === 'short' ? 600 : length === 'detailed' ? 2500 : 1500,
      }),
    });

    if (response.ok) {
      break;
    }

    errBody = await response.text();
    console.warn(`[Admin & HR AI] Model ${modelName} returned status ${response.status}: ${errBody}`);
    if (response.status !== 404 && !errBody.includes('model_not_found')) {
      break;
    }
  }

  if (!response || !response.ok) {
    console.error('Admin & HR AI Error:', response ? response.status : 'No response', errBody);
    throw new Error(`Admin AI Provider returned error status ${response ? response.status : 500}`);
  }

  const data = await response.json();
  const replyText = data.choices?.[0]?.message?.content || '';
  return { reply: replyText.trim(), model: usedModel };
};

/**
 * 1-Click Message Modifier (Shorter, Professional, Friendly, Translate, etc.)
 */
export const modifyAdminHrCommunication = async ({
  existingMessage = '',
  action = 'make_professional', // make_shorter, make_longer, make_professional, make_friendly, make_formal, make_polite, fix_grammar, translate_hi, translate_or, translate_en
}) => {
  const apiKey = (
    process.env.ADMIN_HR_GROQ_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.XAI_API_KEY ||
    ''
  ).trim();

  if (!apiKey) {
    throw new Error('Server API key for Admin & HR AI is missing.');
  }

  const candidateModels = Array.from(new Set([
    process.env.ADMIN_HR_AI_MODEL,
    process.env.GROQ_AI_MODEL,
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama3-70b-8192',
    'llama-3.1-8b-instant',
  ].filter(Boolean)));

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  let actionInstruction = 'Improve the tone and clarity of this message.';
  if (action === 'make_shorter') actionInstruction = 'Make this message significantly shorter and more concise while keeping all core facts and placeholders intact.';
  else if (action === 'make_longer') actionInstruction = 'Expand this message with appropriate professional detail, clarity, and context without adding fake facts.';
  else if (action === 'make_professional') actionInstruction = 'Reframe this message into an executive corporate professional tone.';
  else if (action === 'make_friendly') actionInstruction = 'Adjust the tone to be warm, friendly, and approachable while maintaining business etiquette.';
  else if (action === 'make_formal') actionInstruction = 'Make this message highly formal and official.';
  else if (action === 'make_polite') actionInstruction = 'Ensure maximum politeness and courtesy throughout the message.';
  else if (action === 'fix_grammar') actionInstruction = 'Fix all grammar, spelling, punctuation, and phrasing errors cleanly.';
  else if (action === 'translate_hi') actionInstruction = 'Translate this message into natural professional Hindi (हिंदी script), keeping bracket placeholders and brand names intact.';
  else if (action === 'translate_or') actionInstruction = 'Translate this message into natural professional Odia (ଓଡ଼ିଆ script), keeping bracket placeholders and brand names intact.';
  else if (action === 'translate_en') actionInstruction = 'Translate or convert this message into clean, professional English.';

  const promptText = `
Original Message:
"""
${existingMessage}
"""

Requested Modification Action:
${actionInstruction}

INSTRUCTIONS:
Output ONLY the modified ready-to-send message. Do NOT repeat intro conversational sentences. Maintain bracket placeholders [like this] intact.
`;

  let response;
  let usedModel = candidateModels[0];
  let errBody = '';

  for (const modelName of candidateModels) {
    usedModel = modelName;
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: ADMIN_HR_SYSTEM_PROMPT },
          { role: 'user', content: promptText },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (response.ok) {
      break;
    }

    errBody = await response.text();
    console.warn(`[Admin AI Modifier] Model ${modelName} returned status ${response.status}: ${errBody}`);
    if (response.status !== 404 && !errBody.includes('model_not_found')) {
      break;
    }
  }

  if (!response || !response.ok) {
    console.error('Admin AI Modifier Error:', response ? response.status : 'No response', errBody);
    throw new Error(`Admin AI Modifier returned error status ${response ? response.status : 500}`);
  }

  const data = await response.json();
  const replyText = data.choices?.[0]?.message?.content || '';
  return { reply: replyText.trim(), model: usedModel };
};

/**
 * Generate Google Image SEO Metadata (Caption, Alt Text, Tags) using Zenemoo Admin AI
 */
export const generateImageSeoMetadata = async ({ title = '', category = 'Festivals & Greetings' }) => {
  const apiKey = (
    process.env.ADMIN_HR_GROQ_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.XAI_API_KEY ||
    ''
  ).trim();

  const candidateModels = Array.from(new Set([
    process.env.ADMIN_HR_AI_MODEL,
    process.env.GROQ_AI_MODEL,
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama3-70b-8192',
    'llama-3.1-8b-instant',
  ].filter(Boolean)));

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  const systemPrompt = `You are Zenemoo's Image SEO & Google Search Specialist for Zenemoo (https://www.zenemoo.in/), an Indian AI Data & Multilingual Solutions platform.
Your task is to generate search-optimized, professional metadata for an image/poster to help it rank high on Google Image Search and Google Web Search under "www.zenemoo.in".

Company context:
- Company: Zenemoo (formerly QuantumCoders Data Solution)
- Domain: AI Data Collection, Odia & Indic Speech Datasets, Multilingual Transcription, Voice Over, Annotation, LLM Evaluation
- Website: https://www.zenemoo.in/
- Target Keywords: Zenemoo, AI Data Solutions, Indic Languages, Festival Greetings, Odisha, India

CRITICAL FORMAT REQUIREMENT:
You must respond with valid JSON ONLY. No markdown ticks, no preamble, no commentary.
JSON Schema:
{
  "caption": "A concise, engaging 1-2 sentence description (under 180 characters) explaining what this poster is about, mentioning Zenemoo and its purpose.",
  "altText": "A natural, keyword-dense Alt Text (6-12 words) perfectly describing the visual for Googlebot-Image and accessibility.",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5", "Tag6"]
}`;

  const userPrompt = `Generate Google Image SEO metadata for this asset:
Title: "${title}"
Category: "${category}"

Respond with ONLY valid JSON.`;

  let result = null;
  let usedModel = candidateModels[0];

  if (apiKey) {
    for (const modelName of candidateModels) {
      try {
        usedModel = modelName;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawContent = data.choices?.[0]?.message?.content || '';
          const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed && parsed.caption && parsed.altText && Array.isArray(parsed.tags)) {
            result = parsed;
            break;
          }
        }
      } catch (e) {
        console.warn(`[Image SEO AI] Failed with model ${modelName}:`, e.message);
      }
    }
  }

  // High quality deterministic fallback if API is unreachable
  if (!result) {
    const isFestival = /festival|diwali|holi|eid|christmas|puja|new year|greeting|independence|republic/i.test(title + ' ' + category);
    const isMsme = /msme|udyam|gov|certif|badge|legal|register/i.test(title + ' ' + category);
    
    let caption = `Official ${title} poster published by Zenemoo AI Data Solutions.`;
    let altText = `${title} - Zenemoo AI Platform`;
    let tags = ['Zenemoo', 'AI Technology', 'India'];

    if (isFestival) {
      caption = `Official celebration and festival greeting poster for ${title} by Zenemoo AI Tech team.`;
      altText = `${title} Celebration Greetings Zenemoo AI Platform`;
      tags = [title, 'Zenemoo', 'Festival Greetings', 'Celebration', 'AI Tech India', 'Wishes'];
    } else if (isMsme) {
      caption = `Official verified government registration badge and certificate: ${title} under Zenemoo.`;
      altText = `${title} Official Government Verification Zenemoo`;
      tags = ['MSME Registered', 'Zenemoo Verification', 'Government of India', 'Official Certificate'];
    } else {
      tags = [title, category, 'Zenemoo', 'AI Data Solutions', 'Digital Poster', 'Google Image SEO'];
    }

    result = { caption, altText, tags };
  }

  return { ...result, model: usedModel };
};


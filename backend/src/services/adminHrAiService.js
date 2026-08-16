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

  const modelName = process.env.ADMIN_HR_AI_MODEL || 'llama-3.3-70b-versatile';
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

  const response = await fetch(endpoint, {
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

  if (!response.ok) {
    const errBody = await response.text();
    console.error('Admin & HR AI Error:', response.status, errBody);
    throw new Error(`Admin AI Provider returned error status ${response.status}`);
  }

  const data = await response.json();
  const replyText = data.choices?.[0]?.message?.content || '';
  return { reply: replyText.trim(), model: modelName };
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

  const modelName = process.env.ADMIN_HR_AI_MODEL || 'llama-3.3-70b-versatile';
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

  const response = await fetch(endpoint, {
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

  if (!response.ok) {
    const errBody = await response.text();
    console.error('Admin AI Modifier Error:', response.status, errBody);
    throw new Error(`Admin AI Modifier returned error status ${response.status}`);
  }

  const data = await response.json();
  const replyText = data.choices?.[0]?.message?.content || '';
  return { reply: replyText.trim(), model: modelName };
};

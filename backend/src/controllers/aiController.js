import { processAiChat, getAiAnalyticsMetrics } from '../services/aiService.js';

/**
 * POST /api/ai/chat
 * Secure AI Chat endpoint
 */
export const chatWithAi = async (req, res, next) => {
  try {
    const { messages, language, lengthPreference } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages payload must be a non-empty array.',
      });
    }

    // Input Sanitization
    const sanitizedMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').replace(/<[^>]*>?/gm, '').substring(0, 2000),
    }));

    const targetLang = language === 'hi' || language === 'or' ? language : 'en';
    const validLengthPref = ['short', 'normal', 'detailed', 'auto'].includes(lengthPreference) ? lengthPreference : 'auto';
    const result = await processAiChat(sanitizedMessages, targetLang, validLengthPref);

    return res.json({
      success: true,
      reply: result.reply,
      durationMs: result.durationMs,
      model: result.model,
    });
  } catch (err) {
    console.error('AI Controller Exception:', err.message || err);
    return res.status(500).json({
      success: false,
      message: 'Zenemoo AI is temporarily unavailable. Please try again or contact our team directly at contact@zenemoo.in.',
    });
  }
};

/**
 * GET /api/ai/analytics
 * Retrieve AI Analytics for Admin Dashboard
 */
export const getAiAnalytics = async (req, res, next) => {
  try {
    const metrics = await getAiAnalyticsMetrics();
    return res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
};

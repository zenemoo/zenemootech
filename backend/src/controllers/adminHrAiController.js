import {
  generateAdminHrCommunication,
  modifyAdminHrCommunication,
} from '../services/adminHrAiService.js';

/**
 * POST /api/admin-hr-ai/generate
 * Generate professional Admin / HR communication
 */
export const generateCommunication = async (req, res, next) => {
  try {
    const {
      category = 'email',
      recipientType = 'general',
      purpose = 'general',
      userPrompt = '',
      tone = 'professional',
      length = 'normal',
      language = 'en',
      signature = null,
    } = req.body;

    if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid instruction or message text is required.',
      });
    }

    const sanitizedPrompt = userPrompt.substring(0, 4000);
    const result = await generateAdminHrCommunication({
      category,
      recipientType,
      purpose,
      userPrompt: sanitizedPrompt,
      tone,
      length,
      language,
      signature,
    });

    return res.json({
      success: true,
      data: result.reply,
      model: result.model,
    });
  } catch (err) {
    console.error('Admin HR AI Controller Exception:', err.message || err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate Admin & HR communication.',
    });
  }
};

/**
 * POST /api/admin-hr-ai/modify
 * Perform 1-click modifications on an existing message
 */
export const modifyCommunication = async (req, res, next) => {
  try {
    const { existingMessage = '', action = 'make_professional' } = req.body;

    if (!existingMessage || typeof existingMessage !== 'string' || !existingMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'An existing message is required for modification.',
      });
    }

    const result = await modifyAdminHrCommunication({
      existingMessage: existingMessage.substring(0, 4000),
      action,
    });

    return res.json({
      success: true,
      data: result.reply,
      model: result.model,
    });
  } catch (err) {
    console.error('Admin HR AI Modifier Controller Exception:', err.message || err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to modify message.',
    });
  }
};

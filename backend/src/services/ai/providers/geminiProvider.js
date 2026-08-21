/**
 * Google Gemini AI Provider (Native v1beta REST API)
 */
export const geminiProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  priority: 2,
  getApiKey: () => (process.env.GEMINI_API_KEY || '').trim(),
  isConfigured() {
    return !!this.getApiKey();
  },
  models: [
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Verified)' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
  async generate({ messages, maxTokens = 1500, temperature = 0.25, modelId, signal }) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Gemini API Key is missing.');

    const selectedModel = modelId || this.models[0].id;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }],
      }));

    const systemMsg = messages.find((m) => m.role === 'system');

    const bodyPayload = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemMsg && systemMsg.content) {
      bodyPayload.systemInstruction = {
        parts: [{ text: String(systemMsg.content) }],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`Gemini returned ${response.status}: ${errText.substring(0, 150)}`);
      error.status = response.status;
      error.headers = response.headers;
      throw error;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const reply = candidate?.content?.parts?.map((p) => p.text).join('') || '';
    const finishReason = candidate?.finishReason || '';

    return {
      reply,
      finishReason,
      modelUsed: selectedModel,
      providerId: this.id,
      providerName: this.name,
    };
  },
};

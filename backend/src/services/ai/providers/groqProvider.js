/**
 * Groq AI Provider
 */
export const groqProvider = {
  id: 'groq',
  name: 'Groq Cloud',
  priority: 1,
  getApiKey: () => (process.env.GROQ_AI_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY || '').trim(),
  isConfigured() {
    return !!this.getApiKey();
  },
  models: [
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B' },
    { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B' },
    { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B' },
  ],
  async generate({ messages, maxTokens = 1500, temperature = 0.25, modelId, signal }) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Groq API Key is missing.');

    const selectedModel = modelId || this.models[0].id;
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`Groq returned ${response.status}: ${errText.substring(0, 150)}`);
      error.status = response.status;
      error.headers = response.headers;
      throw error;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';
    const finishReason = data.choices?.[0]?.finish_reason || '';

    return {
      reply,
      finishReason,
      modelUsed: selectedModel,
      providerId: this.id,
      providerName: this.name,
    };
  },
};

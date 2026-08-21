/**
 * OpenRouter Emergency AI Provider
 */
export const openrouterProvider = {
  id: 'openrouter',
  name: 'OpenRouter AI',
  priority: 5,
  getApiKey: () => (process.env.OPENROUTER_API_KEY || '').trim(),
  isConfigured() {
    return !!this.getApiKey();
  },
  models: [
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
  ],
  async generate({ messages, maxTokens = 1500, temperature = 0.25, modelId, signal }) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('OpenRouter API Key is missing.');

    const selectedModel = modelId || this.models[0].id;
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://www.zenemoo.in/',
        'X-Title': 'Zenemoo AI',
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
      const error = new Error(`OpenRouter returned ${response.status}: ${errText.substring(0, 150)}`);
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

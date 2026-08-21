/**
 * Cerebras AI Provider
 */
export const cerebrasProvider = {
  id: 'cerebras',
  name: 'Cerebras AI',
  priority: 3,
  getApiKey: () => (process.env.CEREBRAS_API_KEY || '').trim(),
  isConfigured() {
    return !!this.getApiKey();
  },
  models: [
    { id: 'llama3.3-70b', name: 'Llama 3.3 70B' },
    { id: 'llama3.1-8b', name: 'Llama 3.1 8B' },
  ],
  async generate({ messages, maxTokens = 1500, temperature = 0.25, modelId, signal }) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Cerebras API Key is missing.');

    const selectedModel = modelId || this.models[0].id;
    const endpoint = 'https://api.cerebras.ai/v1/chat/completions';

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
      const error = new Error(`Cerebras returned ${response.status}: ${errText.substring(0, 150)}`);
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

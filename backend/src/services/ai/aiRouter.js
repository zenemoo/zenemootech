import { getAvailableProviders } from './providerRegistry.js';
import {
  isProviderModelHealthy,
  recordSuccess,
  recordFailure,
} from './providerHealth.js';

/**
 * Multi-Provider AI Router
 * Routes requests across Groq, Gemini, Cerebras, Mistral, and OpenRouter
 * with intelligent fallback, rate-limit backoff, and circuit breaker protection.
 */
export const routeAiRequest = async ({
  messages,
  maxTokens = 1500,
  temperature = 0.25,
  requestId = 'req_gen',
}) => {
  const availableProviders = getAvailableProviders();

  if (availableProviders.length === 0) {
    console.warn(`[AI Router] ${requestId} No AI providers are configured with API keys.`);
    return {
      reply: 'Zenemoo AI is currently operating in offline mode. Please contact contact@zenemoo.in for assistance.',
      durationMs: 0,
      modelUsed: 'offline-fallback',
      providerId: 'none',
      providerName: 'None',
    };
  }

  // Build ordered candidate list of { provider, model }
  const candidatePool = [];
  availableProviders.forEach((p) => {
    p.models.forEach((m) => {
      candidatePool.push({ provider: p, model: m });
    });
  });

  // Filter healthy candidates
  let healthyCandidates = candidatePool.filter(({ provider, model }) =>
    isProviderModelHealthy(provider.id, model.id)
  );

  if (healthyCandidates.length === 0) {
    console.warn(`[AI Router] ${requestId} All primary models in cooldown, attempting emergency pool`);
    healthyCandidates = candidatePool;
  }

  const routerStartTime = Date.now();
  let successfulResult = null;
  let attemptsCount = 0;

  for (const { provider, model } of healthyCandidates) {
    attemptsCount += 1;
    const attemptStartTime = Date.now();

    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      try {
        console.log(
          `[AI Router] ${requestId} [Attempt ${attemptsCount}.${attempt}] Provider: ${provider.name} (${provider.id}) Model: ${model.id}`
        );

        const result = await provider.generate({
          messages,
          maxTokens,
          temperature,
          modelId: model.id,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (result && result.reply) {
          const latencyMs = Date.now() - attemptStartTime;
          recordSuccess(provider.id, model.id, latencyMs);
          successfulResult = {
            ...result,
            latencyMs,
            totalRouterDurationMs: Date.now() - routerStartTime,
          };
          console.log(
            `[AI Router] ${requestId} SUCCESS Provider: ${provider.name} Model: ${model.id} Latency: ${latencyMs}ms`
          );
          break;
        }
      } catch (err) {
        clearTimeout(timeoutId);

        const status = err.status || (err.name === 'AbortError' ? 504 : 500);
        const retryAfterHeader = err.headers?.get ? err.headers.get('retry-after') : null;
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) || 2 : 2;

        console.warn(
          `[AI Router] ${requestId} FAIL Provider: ${provider.name} Model: ${model.id} Status: ${status} Error: ${err.message}`
        );

        recordFailure(provider.id, model.id, status, retryAfterSec);

        if (status === 429) {
          // If retry-after is short (<= 2s) and attempt 1, do short backoff and retry once
          if (retryAfterSec <= 2 && attempt === 1) {
            const backoffMs = Math.round(retryAfterSec * 1000 + Math.random() * 300);
            console.log(`[AI Router] ${requestId} 429 short rate limit. Backing off ${backoffMs}ms before retry...`);
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          // Otherwise, break out immediately and fallback to the NEXT provider!
          break;
        }

        if (status === 404 || status === 400 || status === 401 || status === 403) {
          // Missing model or auth error -> skip provider immediately
          break;
        }

        if (status >= 500 && attempt === 1) {
          // Transient server error -> brief 600ms backoff and retry once
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
      }
    }

    if (successfulResult) break;
  }

  if (!successfulResult) {
    console.error(`[AI Router] ${requestId} All provider fallbacks exhausted.`);
    return {
      reply: 'Zenemoo AI is temporarily busy across providers. Please try again in a moment or contact our team directly at [contact@zenemoo.in](mailto:contact@zenemoo.in).',
      durationMs: Date.now() - routerStartTime,
      modelUsed: 'all-providers-busy',
      providerId: 'fallback',
      providerName: 'Zenemoo Fallback',
    };
  }

  return successfulResult;
};

/**
 * In-Memory Provider & Model Health Registry
 * Tracks availability, circuit breaker cooldowns, latency metrics, and error rates.
 */

const healthRegistry = new Map();

export const initProviderHealth = (providers = []) => {
  providers.forEach((p) => {
    p.models.forEach((m) => {
      const key = `${p.id}:${m.id}`;
      if (!healthRegistry.has(key)) {
        healthRegistry.set(key, {
          providerId: p.id,
          providerName: p.name,
          modelId: m.id,
          modelName: m.name || m.id,
          healthy: true,
          consecutiveFailures: 0,
          cooldownUntil: 0,
          lastSuccessAt: null,
          lastFailureAt: null,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          total429: 0,
          total4xx: 0,
          total5xx: 0,
          latencies: [],
        });
      }
    });
  });
};

export const getModelHealthRecord = (providerId, modelId) => {
  const key = `${providerId}:${modelId}`;
  return healthRegistry.get(key) || null;
};

export const isProviderModelHealthy = (providerId, modelId) => {
  const record = getModelHealthRecord(providerId, modelId);
  if (!record) return true;

  if (record.cooldownUntil && Date.now() < record.cooldownUntil) {
    return false;
  }

  // Circuit breaker: 3 consecutive failures within 60s triggers a 45s cooldown
  if (record.consecutiveFailures >= 3 && record.lastFailureAt && Date.now() - record.lastFailureAt < 45000) {
    return false;
  }

  return record.healthy;
};

export const recordSuccess = (providerId, modelId, latencyMs) => {
  const key = `${providerId}:${modelId}`;
  let record = healthRegistry.get(key);
  if (!record) {
    record = {
      providerId,
      providerName: providerId,
      modelId,
      modelName: modelId,
      healthy: true,
      consecutiveFailures: 0,
      cooldownUntil: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      total429: 0,
      total4xx: 0,
      total5xx: 0,
      latencies: [],
    };
    healthRegistry.set(key, record);
  }

  record.healthy = true;
  record.consecutiveFailures = 0;
  record.cooldownUntil = 0;
  record.lastSuccessAt = Date.now();
  record.totalRequests += 1;
  record.successfulRequests += 1;
  record.latencies.push(latencyMs);
  if (record.latencies.length > 50) record.latencies.shift();
};

export const recordFailure = (providerId, modelId, status, retryAfterSec = 30) => {
  const key = `${providerId}:${modelId}`;
  let record = healthRegistry.get(key);
  if (!record) return;

  record.lastFailureAt = Date.now();
  record.totalRequests += 1;
  record.failedRequests += 1;
  record.consecutiveFailures += 1;

  if (status === 429) {
    record.total429 += 1;
    const cooldownMs = Math.max((retryAfterSec || 15) * 1000, 15000);
    record.cooldownUntil = Date.now() + cooldownMs;
  } else if (status === 404 || status === 400 || status === 401 || status === 403 || status === 402) {
    // Permanent/account/credit failure -> mark unhealthy for 5 minutes
    record.total4xx += 1;
    record.healthy = false;
    record.cooldownUntil = Date.now() + 300000;
  } else if (status >= 500) {
    record.total5xx += 1;
  }
};

export const getFullHealthTelemetry = () => {
  const providersSummary = {};
  let globalTotalRequests = 0;
  let globalTotalSuccess = 0;
  let globalTotalFailed = 0;
  let globalTotal429 = 0;
  let globalTotal4xx = 0;
  let globalTotal5xx = 0;
  const allLatencies = [];

  healthRegistry.forEach((rec, key) => {
    globalTotalRequests += rec.totalRequests;
    globalTotalSuccess += rec.successfulRequests;
    globalTotalFailed += rec.failedRequests;
    globalTotal429 += rec.total429;
    globalTotal4xx += rec.total4xx;
    globalTotal5xx += rec.total5xx;
    allLatencies.push(...rec.latencies);

    const avgLat = rec.latencies.length > 0
      ? Math.round(rec.latencies.reduce((a, b) => a + b, 0) / rec.latencies.length)
      : 0;

    const rate = rec.totalRequests > 0
      ? Math.round((rec.successfulRequests / rec.totalRequests) * 100)
      : 100;

    providersSummary[key] = {
      provider: rec.providerName,
      model: rec.modelName,
      healthy: rec.healthy && (!rec.cooldownUntil || Date.now() >= rec.cooldownUntil),
      successRatePercent: `${rate}%`,
      totalRequests: rec.totalRequests,
      successfulRequests: rec.successfulRequests,
      failedRequests: rec.failedRequests,
      total429: rec.total429,
      total4xx: rec.total4xx,
      total5xx: rec.total5xx,
      averageLatencyMs: avgLat,
      lastSuccessAt: rec.lastSuccessAt ? new Date(rec.lastSuccessAt).toISOString() : null,
      lastFailureAt: rec.lastFailureAt ? new Date(rec.lastFailureAt).toISOString() : null,
    };
  });

  allLatencies.sort((a, b) => a - b);
  const p95Index = Math.floor(allLatencies.length * 0.95);
  const p95LatencyMs = allLatencies.length > 0 ? allLatencies[p95Index] || allLatencies[allLatencies.length - 1] : 0;
  const avgGlobalLatencyMs = allLatencies.length > 0
    ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length)
    : 0;

  const overallSuccessRatePercent = globalTotalRequests > 0
    ? `${Math.round((globalTotalSuccess / globalTotalRequests) * 100)}%`
    : '100%';

  return {
    overallSuccessRatePercent,
    totalRequests: globalTotalRequests,
    successfulRequests: globalTotalSuccess,
    failedRequests: globalTotalFailed,
    total429: globalTotal429,
    total4xx: globalTotal4xx,
    total5xx: globalTotal5xx,
    avgLatencyMs: avgGlobalLatencyMs,
    p95LatencyMs,
    providerModels: providersSummary,
  };
};

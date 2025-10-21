import { onCLS, onFID, onLCP, onTTFB, onFCP, Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const endpoint = import.meta.env.VITE_RUM_ENDPOINT;
  if (!endpoint) {
    return;
  }
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta,
    navigationType: metric.navigationType,
    timestamp: Date.now()
  });

  navigator.sendBeacon?.(endpoint, body);
}

export function reportRUM() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onFCP(sendToAnalytics);
}

export function getHealthStatus() {
  return {
    status: 'ok',
    service: 'handy-api',
    timestamp: new Date().toISOString(),
  };
}

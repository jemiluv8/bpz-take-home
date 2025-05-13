export function sleep(seconds = 5) {
  const durationMs = Math.max(0, seconds) * 1000;
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

import type { PipelineEvent } from "./pipeline";

export async function readReviewStream(response: Response, onEvent: (event: PipelineEvent) => void) {
  if (!response.body) throw new Error("The review stream was empty. Please retry.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", completed = false;
  function line(value: string) {
    if (!value.trim()) return;
    const event = JSON.parse(value) as PipelineEvent;
    if (event.type === "error") throw new Error(event.error);
    onEvent(event);
    if (event.type === "result") completed = true;
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 1_000_000) throw new Error("The review response was too large.");
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) { line(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1); }
      if (done) break;
    }
    line(buffer);
    if (!completed) throw new Error("The review connection ended before completion. Please retry.");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

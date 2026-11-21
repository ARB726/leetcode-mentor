export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(415, "Send application/json content.");
  }
  const declared = Number(request.headers.get("content-length"));
  if (declared > 100_000) throw new ApiError(413, "This submission is too large.");
  if (!request.body) throw new ApiError(400, "The request body is empty.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 100_000) {
      await reader.cancel();
      throw new ApiError(413, "This submission is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { throw new ApiError(400, "The request body must be valid JSON."); }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Mentor request failed", error instanceof Error ? error.name : "UnknownError");
  return Response.json({ error: "The request could not finish. Please try again." }, { status: 500 });
}

const buckets = new Map<string, { count: number; expires: number }>();
export function rateLimit(key: string, limit: number, now = Date.now()) {
  for (const [id, entry] of buckets) if (entry.expires <= now) buckets.delete(id);
  let entry = buckets.get(key);
  if (!entry) {
    if (buckets.size >= 5000) throw new ApiError(429, "The service is busy. Please retry shortly.");
    entry = { count: 0, expires: now + 10 * 60_000 };
    buckets.set(key, entry);
  }
  if (entry.count >= limit) throw new ApiError(429, "You've reached the practice limit for this 10-minute window. Please take a short break.");
  entry.count++;
}

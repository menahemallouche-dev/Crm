import { createHmac, timingSafeEqual } from "crypto";

/**
 * Shared HMAC-SHA256 contract used by both directions of the ERP/WMS/billing
 * connectors: outbound requests sign `JSON.stringify(payload)` with the
 * connector's secret and send it as `X-Gecodis-Signature`; inbound webhooks
 * from those same systems must be signed the same way over their raw
 * request body to be accepted (see verifyRawSignature).
 */
export function signPayload(payload: unknown, secret: string): string {
  return createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

function safeEqual(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/** Verifies a signature computed over an already-serialized payload (outbound-side symmetry checks, tests). */
export function verifySignature(payload: unknown, secret: string, signature: string | undefined): boolean {
  if (!signature) return false;
  return safeEqual(signPayload(payload, secret), signature);
}

/** Verifies a signature computed over the exact raw request bytes — use this for inbound webhooks. */
export function verifyRawSignature(rawBody: Buffer, secret: string, signature: string | undefined): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

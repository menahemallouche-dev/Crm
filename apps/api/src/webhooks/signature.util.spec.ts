import { signPayload, verifyRawSignature, verifySignature } from "./signature.util";

describe("signPayload / verifySignature", () => {
  const secret = "shh-its-a-secret";
  const payload = { event: "quote.signed", data: { reference: "DEV-2026-00001" } };

  it("produces a signature that verifies against the same payload and secret", () => {
    const sig = signPayload(payload, secret);
    expect(verifySignature(payload, secret, sig)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const sig = signPayload(payload, secret);
    const tampered = { ...payload, data: { reference: "DEV-2026-99999" } };
    expect(verifySignature(tampered, secret, sig)).toBe(false);
  });

  it("rejects the right payload signed with the wrong secret", () => {
    const sig = signPayload(payload, "wrong-secret");
    expect(verifySignature(payload, secret, sig)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifySignature(payload, secret, undefined)).toBe(false);
  });

  it("is deterministic for the same payload and secret", () => {
    expect(signPayload(payload, secret)).toBe(signPayload(payload, secret));
  });
});

describe("verifyRawSignature", () => {
  const secret = "raw-body-secret";

  it("verifies a signature computed over the exact raw bytes", () => {
    const raw = Buffer.from(JSON.stringify({ event: "invoice.paid", data: { reference: "FAC-2026-0001" } }));
    const sig = signPayload(JSON.parse(raw.toString()), secret);
    expect(verifyRawSignature(raw, secret, sig)).toBe(true);
  });

  it("rejects if the raw bytes differ even when the parsed JSON is equivalent", () => {
    // Different key order / whitespace → different bytes → different HMAC, even though
    // the parsed object is deep-equal. This is exactly the guarantee raw-body
    // verification is meant to provide over re-serializing the parsed body.
    const original = { event: "invoice.paid", data: { reference: "FAC-2026-0001" } };
    const sig = signPayload(original, secret);
    const reorderedRaw = Buffer.from(JSON.stringify({ data: { reference: "FAC-2026-0001" }, event: "invoice.paid" }));
    expect(verifyRawSignature(reorderedRaw, secret, sig)).toBe(false);
  });

  it("rejects when the secret is empty", () => {
    const raw = Buffer.from(JSON.stringify({ event: "x" }));
    const sig = signPayload({ event: "x" }, "");
    expect(verifyRawSignature(raw, "", sig)).toBe(false);
  });

  it("rejects a missing signature", () => {
    const raw = Buffer.from(JSON.stringify({ event: "x" }));
    expect(verifyRawSignature(raw, secret, undefined)).toBe(false);
  });

  it("is resistant to a signature of different length (no crash, just rejects)", () => {
    const raw = Buffer.from(JSON.stringify({ event: "x" }));
    expect(verifyRawSignature(raw, secret, "not-a-real-signature")).toBe(false);
  });
});

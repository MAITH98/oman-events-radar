import crypto from "node:crypto";

const MAX_AGE_SECONDS = 300; // reject replays older than 5 minutes

/** rawBody must be the exact bytes received (Buffer), before JSON parsing. */
export function verifyRadarSignature(rawBody, timestamp, signature, secret) {
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

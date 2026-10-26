import express from "express";
import { verifyRadarSignature } from "./verify-webhook.mjs";

const app = express();

// Keep the raw body: the signature is computed over the exact bytes.
app.post("/webhooks/oman-events", express.raw({ type: "application/json", limit: "5mb" }), (req, res) => {
  const ok = verifyRadarSignature(
    req.body,
    req.get("X-Radar-Timestamp"),
    req.get("X-Radar-Signature"),
    process.env.RADAR_WEBHOOK_SECRET,
  );
  if (!ok) return res.status(401).send("invalid signature");

  const { changes } = JSON.parse(req.body.toString("utf8"));
  for (const change of changes) {
    // Upsert by change.event_id; skip if change.idempotency_key was already processed.
    console.log(change.sequence, change.type, change.event.title);
  }
  res.sendStatus(204);
});

app.listen(3000);

import "dotenv/config";
import express from "express";
import cors from "cors";
import { router } from "./routes.js";

import { getProviderConfig } from "./generator.js";

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => {
  const config = getProviderConfig();
  res.json({
    ok: true,
    hasApiKey: Boolean(config.apiKey),
    provider: config.provider,
    model: config.model,
  });
});

app.use("/api", router);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  const config = getProviderConfig();
  console.log(`AI site builder API listening on http://localhost:${PORT}`);
  if (!config.apiKey) {
    console.warn("⚠️  No API key configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY in server/.env).");
  } else {
    console.log(`✨ Using provider: ${config.provider.toUpperCase()} (${config.model})`);
  }
});

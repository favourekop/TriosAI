import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import { z } from "zod";\nimport { createClient } from "@supabase/supabase-js";
import { PLANS } from "./plans";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map(v => v.trim());

app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("Origin not allowed by CORS"));
} }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "triosai-api", timestamp: new Date().toISOString() }));
app.get("/api/plans", (_req, res) => res.json({ plans: Object.values(PLANS) }));

const requireAuth: express.RequestHandler = async (req, res, next) => {\n  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;\n  if (!token) return res.status(401).json({ error: "Sign in to use your AI workspace." });\n  const url = process.env.SUPABASE_URL;\n  const anonKey = process.env.SUPABASE_ANON_KEY;\n  if (!url || !anonKey) return res.status(503).json({ error: "Authentication is not configured on the server yet." });\n  try {\n    const authClient = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });\n    const { data, error } = await authClient.auth.getUser(token);\n    if (error || !data.user) return res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });\n    res.locals.userId = data.user.id;\n    next();\n  } catch { return res.status(401).json({ error: "Unable to verify your session." }); }\n};\n\nconst chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(12_000)
  })).min(1).max(30)
});

app.post("/api/chat", requireAuth, async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please send a valid chat message." });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "AI chat is not connected yet. Add OPENAI_API_KEY to the server environment to enable it." });
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: "You are TriosAI, a helpful, clear and thoughtful AI companion. Be accurate, practical and transparent about uncertainty.",
      input: parsed.data.messages
    });
    res.json({ reply: response.output_text });
  } catch (error) {
    console.error("AI request failed:", error);
    res.status(502).json({ error: "The AI service could not complete that request. Please try again." });
  }
});

app.post("/api/files/analyze", (_req, res) => {
  res.status(501).json({ error: "File analysis is not enabled yet. Secure upload storage, file scanning and document extraction must be configured first." });
});

app.post("/api/billing/initialize", (_req, res) => {
  res.status(501).json({ error: "Checkout is not enabled yet. Configure plan prices and verified Paystack callbacks before accepting payments." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`TriosAI API listening on port ${port}`);
});
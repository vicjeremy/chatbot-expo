import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  securityHeaders,
  chatLimiter,
  apiLimiter,
  sanitizeInput,
  validateChatRequest,
} from "./middleware/security.js";
import { mcpManager } from "./mcp-client.js";
import { getAIClient } from "./ollama-client.js";

const app = express();
const PORT = process.env.PORT || 3001;

function resolveTrustProxy(value) {
  if (value === undefined || value === null || value === "") {
    return 1;
  }

  const normalized = String(value).toLowerCase().trim();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;

  const parsedNumber = Number(normalized);
  if (!Number.isNaN(parsedNumber)) return parsedNumber;

  return normalized;
}

app.set("trust proxy", resolveTrustProxy(process.env.TRUST_PROXY));

// --- Global Middleware ---
app.use(securityHeaders);
app.use(
  cors({
    origin:
      process.env.ALLOWED_ORIGINS === "*"
        ? true
        : process.env.ALLOWED_ORIGINS?.split(","),
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeInput);

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mcpInitialized: mcpManager.initialized,
    dbPath: mcpManager.dbPath,
  });
});

// --- Chat Endpoint ---
app.post("/api/chat", chatLimiter, validateChatRequest, async (req, res) => {
  try {
    const { message, history, provider, providerConfig } = req.body;
    console.log(`\n💬 Chat: "${message.substring(0, 100)}..."`);

    const aiClient = getAIClient();
    const response = await aiClient.chat(
      message,
      history || [],
      provider,
      providerConfig || {},
    );

    res.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Chat error:", err);

    if (err.message?.includes("API key")) {
      return res.status(401).json({ error: "Invalid or missing API key." });
    }
    if (err.message?.includes("quota") || err.message?.includes("rate")) {
      return res.status(429).json({
        error:
          "AI rate limit reached. Retry in a few seconds, or switch provider/model in settings.",
      });
    }

    res.status(500).json({
      error: "Failed to process your message. Please try again.",
    });
  }
});

// --- Notes Endpoints (direct access, bypasses AI) ---
app.get("/api/notes", apiLimiter, async (req, res) => {
  try {
    const notes = await mcpManager.listNotes();
    res.json({ notes });
  } catch (err) {
    console.error("❌ List notes error:", err);
    res.status(500).json({ error: "Failed to retrieve notes." });
  }
});

app.get("/api/notes/search", apiLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q)
      return res.status(400).json({ error: "Search query (q) is required." });

    const notes = await mcpManager.searchNotes(q);
    res.json({ notes });
  } catch (err) {
    console.error("❌ Search notes error:", err);
    res.status(500).json({ error: "Failed to search notes." });
  }
});

app.delete("/api/notes/:id", apiLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Note ID is required." });

    const result = await mcpManager.deleteNote(id);
    if (!result?.deleted) {
      return res.status(404).json({
        error: result?.reason || "Note not found.",
        details: result,
      });
    }
    res.json(result);
  } catch (err) {
    console.error("❌ Delete note error:", err);
    res.status(500).json({ error: "Failed to delete note." });
  }
});

app.put("/api/notes/:id", apiLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body || {};

    if (!id) return res.status(400).json({ error: "Note ID is required." });
    if (title !== undefined && typeof title !== "string") {
      return res.status(400).json({ error: "Title must be a string." });
    }
    if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({ error: "Content must be a string." });
    }

    const result = await mcpManager.updateNote(id, title, content);
    res.json(result);
  } catch (err) {
    console.error("❌ Update note error:", err);
    res.status(500).json({ error: "Failed to update note." });
  }
});

// --- Error Handler ---
app.use((err, req, res, _next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({ error: "An unexpected error occurred." });
});

// --- Startup ---
async function start() {
  try {
    console.log("🤖 Starting Chatbot Expo Server...");
    console.log("───────────────────────────────────");

    // Initialize MCP connections
    try {
      await mcpManager.initialize();
    } catch (err) {
      console.warn(
        "⚠️ Continuing with limited/no MCP features due to init error.",
      );
    }

    // Verify AI client config
    const aiClient = getAIClient();
    console.log(
      `✅ AI client initialized (default provider: ${aiClient.getDefaultProvider()})`,
    );

    app.listen(PORT, () => {
      console.log("───────────────────────────────────");
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Health: http://localhost:${PORT}/api/health`);
      console.log("───────────────────────────────────");
    });
  } catch (err) {
    console.error("💥 Failed to start server:", err.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await mcpManager.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mcpManager.shutdown();
  process.exit(0);
});

start();

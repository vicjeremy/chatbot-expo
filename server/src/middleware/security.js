import helmet from "helmet";
import rateLimit from "express-rate-limit";
import xss from "xss";

// Helmet for secure HTTP headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiter for chat endpoint (more restrictive)
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: "Too many chat requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input sanitization middleware
export function sanitizeInput(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

function sanitizeObject(obj) {
  if (typeof obj === "string") {
    return xss(obj.trim());
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[xss(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

// Validate chat request body
export function validateChatRequest(req, res, next) {
  const { message, history, provider, providerConfig } = req.body;

  if (!message || typeof message !== "string") {
    return res
      .status(400)
      .json({ error: "Message is required and must be a string." });
  }

  if (message.length > 4000) {
    return res
      .status(400)
      .json({ error: "Message is too long (max 4000 characters)." });
  }

  if (history && !Array.isArray(history)) {
    return res.status(400).json({ error: "History must be an array." });
  }

  if (history && history.length > 50) {
    return res
      .status(400)
      .json({ error: "Conversation history too long (max 50 messages)." });
  }

  if (
    provider &&
    !["ollama", "gemini", "groq"].includes(String(provider).toLowerCase())
  ) {
    return res
      .status(400)
      .json({ error: "Provider must be one of: ollama, gemini, groq." });
  }

  if (providerConfig && typeof providerConfig !== "object") {
    return res.status(400).json({ error: "providerConfig must be an object." });
  }

  const maxFieldLength = 300;
  const configFields = [
    "geminiApiKey",
    "groqApiKey",
    "ollamaModel",
    "geminiModel",
    "groqModel",
    "geminiBaseUrl",
    "groqBaseUrl",
  ];

  if (providerConfig) {
    for (const key of configFields) {
      const value = providerConfig[key];
      if (value !== undefined && typeof value !== "string") {
        return res
          .status(400)
          .json({ error: `providerConfig.${key} must be a string.` });
      }
      if (typeof value === "string" && value.length > maxFieldLength) {
        return res
          .status(400)
          .json({
            error: `providerConfig.${key} is too long (max ${maxFieldLength}).`,
          });
      }
    }
  }

  next();
}

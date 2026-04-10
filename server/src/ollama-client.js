import { Ollama } from "ollama";
import { getOllamaTools } from "./tools.js";
import { mcpManager } from "./mcp-client.js";

const SUPPORTED_PROVIDERS = ["ollama", "gemini", "groq"];

const SYSTEM_PROMPT = `You are a helpful AI research assistant embedded in a chatbot app. You have access to the following capabilities:

1. **Web Research** (via fetch_webpage): You can fetch and read any web page to help users research topics.
2. **Notes Management** (via save_note, list_notes, search_notes, update_note, delete_note): You can save, organize, search, update, and delete the user's notes.

**Guidelines:**
- When users share a URL or ask you to look something up, use fetch_webpage to get the content and provide a clear summary.
- When users ask you to save or remember something, use save_note with a clear title and well-formatted content.
- When users ask about their saved notes, use list_notes or search_notes.
- Always be concise, helpful, and friendly.
- When saving notes from fetched web pages, include the source URL.
- Format responses with markdown for readability.
- If a tool call fails, explain the error clearly and suggest alternatives.
- CRITICAL: Once you receive tool output, you MUST provide a final textual answer to the user summarizing the result. Do not call the same tool again in a loop!`;

class AIClient {
  constructor() {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    this.defaultProvider = this.normalizeProvider(process.env.AI_PROVIDER);

    this.models = {
      ollama: process.env.OLLAMA_MODEL || "llama3.2",
      gemini: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      groq: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    };

    this.keys = {
      gemini: process.env.GEMINI_API_KEY,
      groq: process.env.GROQ_API_KEY,
    };

    this.baseUrls = {
      gemini:
        process.env.GEMINI_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta/openai",
      groq: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    };

    // Create a configured Ollama instance
    this.ollama = new Ollama({ host });
  }

  normalizeProvider(provider) {
    const normalized = (provider || "ollama").toLowerCase().trim();
    return SUPPORTED_PROVIDERS.includes(normalized) ? normalized : "ollama";
  }

  getDefaultProvider() {
    return this.defaultProvider;
  }

  buildMessages(userMessage, history = []) {
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    history.forEach((msg) => {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    });

    messages.push({ role: "user", content: userMessage });
    return messages;
  }

  parseToolArgs(rawArgs) {
    if (!rawArgs) return {};
    if (typeof rawArgs === "object") return rawArgs;

    if (typeof rawArgs === "string") {
      try {
        const parsed = JSON.parse(rawArgs);
        return typeof parsed === "object" && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    }

    return {};
  }

  toToolContent(result) {
    if (typeof result === "string") return result;
    try {
      return JSON.stringify(result);
    } catch {
      return String(result);
    }
  }

  parseToolResult(result) {
    if (result === null || result === undefined) return null;
    if (typeof result === "object") return result;
    if (typeof result === "string") {
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    }
    return result;
  }

  buildDirectNoteReply(userMessage, toolOutcomes = []) {
    if (!Array.isArray(toolOutcomes) || toolOutcomes.length === 0) return null;

    const deleteOutcome = toolOutcomes.find((o) => o.name === "delete_note");
    if (deleteOutcome) {
      if (deleteOutcome.error) {
        return `I couldn't delete that note: ${deleteOutcome.error}`;
      }

      if (deleteOutcome.parsed?.deleted) {
        const title = deleteOutcome.parsed?.title;
        return title
          ? `Done. The note \"${title}\" was deleted successfully.`
          : "Done. The note was deleted successfully.";
      }

      if (deleteOutcome.parsed?.deleted === false) {
        const reason =
          deleteOutcome.parsed?.reason || "No matching note was deleted.";
        const matches = Array.isArray(deleteOutcome.parsed?.matches)
          ? deleteOutcome.parsed.matches
          : [];

        if (matches.length > 0) {
          const suggestion = matches
            .slice(0, 3)
            .map((m) => `- ${m.title} (id: ${m.id})`)
            .join("\n");
          return `${reason}\n\nPlease choose one of these note IDs:\n${suggestion}`;
        }

        return `I couldn't delete that note: ${reason}`;
      }
    }

    const updateOutcome = toolOutcomes.find((o) => o.name === "update_note");
    if (updateOutcome) {
      if (updateOutcome.error) {
        return `I couldn't update that note: ${updateOutcome.error}`;
      }

      if (updateOutcome.parsed?.updated) {
        return "Done. The note was updated successfully.";
      }
    }

    const saveOutcome = toolOutcomes.find((o) => o.name === "save_note");
    if (saveOutcome) {
      if (saveOutcome.error) {
        return `I couldn't save that note: ${saveOutcome.error}`;
      }

      if (saveOutcome.parsed?.id || saveOutcome.parsed?.title) {
        const title = saveOutcome.parsed?.title || "your note";
        return `Saved successfully: ${title}.`;
      }
    }

    const lower = String(userMessage || "").toLowerCase();
    const isListIntent =
      /\b(list|show|view)\b/.test(lower) && /\b(note|notes)\b/.test(lower);
    const listOutcome = toolOutcomes.find((o) => o.name === "list_notes");
    if (isListIntent && listOutcome && Array.isArray(listOutcome.parsed)) {
      if (listOutcome.parsed.length === 0) {
        return "You don't have any saved notes yet.";
      }
      return null;
    }

    return null;
  }

  async executeToolCalls(toolCalls, messages, provider = "ollama") {
    const outcomes = [];

    for (const tool of toolCalls) {
      const name = tool?.function?.name;
      const args = this.parseToolArgs(tool?.function?.arguments);

      if (!name) {
        continue;
      }

      console.log(`🔧 Tool call: ${name}(${JSON.stringify(args)})`);

      let toolResult;
      let toolError = null;
      try {
        toolResult = await mcpManager.executeTool(name, args || {});
      } catch (err) {
        console.error(`❌ Tool error (${name}):`, err.message);
        toolError = err.message;
        toolResult = JSON.stringify({ error: err.message });
      }

      const parsed = this.parseToolResult(toolResult);
      outcomes.push({
        name,
        args,
        parsed,
        error: toolError || parsed?.error || null,
      });

      const toolContent = this.toToolContent(toolResult);
      console.log(
        `✅ Tool result (${name}): ${toolContent.substring(0, 200)}...`,
      );

      if (provider === "ollama") {
        messages.push({
          role: "tool",
          name,
          tool_name: name,
          content: toolContent,
          tool_call_id: tool?.id,
        });
      } else {
        messages.push({
          role: "tool",
          content: toolContent,
          tool_call_id: tool?.id,
        });
      }
    }

    return outcomes;
  }

  async chatWithRuntimeConfig(
    userMessage,
    history = [],
    provider,
    runtimeConfig = {},
  ) {
    if (provider === "ollama") {
      const model = runtimeConfig.ollamaModel || this.models.ollama;
      return this.chatWithOllama(userMessage, history, model);
    }

    if (provider === "gemini") {
      return this.chatWithOpenAICompatible(
        {
          provider,
          baseUrl: runtimeConfig.geminiBaseUrl || this.baseUrls.gemini,
          apiKey: runtimeConfig.geminiApiKey || this.keys.gemini,
          model: runtimeConfig.geminiModel || this.models.gemini,
        },
        userMessage,
        history,
      );
    }

    return this.chatWithOpenAICompatible(
      {
        provider,
        baseUrl: runtimeConfig.groqBaseUrl || this.baseUrls.groq,
        apiKey: runtimeConfig.groqApiKey || this.keys.groq,
        model: runtimeConfig.groqModel || this.models.groq,
      },
      userMessage,
      history,
    );
  }

  async chat(userMessage, history = [], providerOverride, runtimeConfig = {}) {
    const provider = this.normalizeProvider(
      providerOverride || this.defaultProvider,
    );
    return this.chatWithRuntimeConfig(
      userMessage,
      history,
      provider,
      runtimeConfig,
    );
  }

  async chatWithOllama(userMessage, history = [], model) {
    const messages = this.buildMessages(userMessage, history);

    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      const response = await this.ollama.chat({
        model,
        messages: messages,
        tools: getOllamaTools(),
      });

      // Add the model's message (which could contain text or tool calls) to history
      messages.push(response.message);

      // Check if the model decided to call tools
      if (
        !response.message.tool_calls ||
        response.message.tool_calls.length === 0
      ) {
        // Return the final text if no tools were called
        return (
          response.message.content ||
          "I processed your request but have no additional response."
        );
      }

      const toolOutcomes = await this.executeToolCalls(
        response.message.tool_calls,
        messages,
        "ollama",
      );

      const directNoteReply = this.buildDirectNoteReply(
        userMessage,
        toolOutcomes,
      );
      if (directNoteReply) {
        return directNoteReply;
      }

      // Force a final response without tool declarations to prevent tool-call loops.
      const finalResponse = await this.ollama.chat({
        model,
        messages: [
          ...messages,
          {
            role: "user",
            content:
              "Use the tool results above to answer my original request now. Do not call tools again.",
          },
        ],
      });

      if (finalResponse?.message?.content) {
        return finalResponse.message.content;
      }

      iteration++;
    }

    return "I reached the maximum number of tool executions and couldn't complete your request.";
  }

  async chatWithOpenAICompatible(config, userMessage, history = []) {
    if (!config.apiKey) {
      throw new Error(
        `Missing API key for provider '${config.provider}'. Set ${config.provider.toUpperCase()}_API_KEY in server/.env or provide it in frontend settings.`,
      );
    }

    const messages = this.buildMessages(userMessage, history);
    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      const response = await this.callOpenAICompatible(config, messages, true);
      const assistantMessage = response?.choices?.[0]?.message;

      if (!assistantMessage) {
        return "I processed your request but received an empty response from the AI provider.";
      }

      messages.push({
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: assistantMessage.tool_calls,
      });

      if (
        !assistantMessage.tool_calls ||
        assistantMessage.tool_calls.length === 0
      ) {
        return (
          assistantMessage.content ||
          "I processed your request but have no additional response."
        );
      }

      const toolOutcomes = await this.executeToolCalls(
        assistantMessage.tool_calls,
        messages,
        config.provider,
      );

      const directNoteReply = this.buildDirectNoteReply(
        userMessage,
        toolOutcomes,
      );
      if (directNoteReply) {
        return directNoteReply;
      }

      const finalResponse = await this.callOpenAICompatible(
        config,
        [
          ...messages,
          {
            role: "user",
            content:
              "Use the tool results above to answer my original request now. Do not call tools again.",
          },
        ],
        false,
      );

      const finalMessage = finalResponse?.choices?.[0]?.message;
      if (finalMessage?.content) {
        return finalMessage.content;
      }

      iteration++;
    }

    return "I reached the maximum number of tool executions and couldn't complete your request.";
  }

  async callOpenAICompatible(config, messages, includeTools) {
    const payload = {
      model: config.model,
      messages,
      temperature: 0.4,
    };

    if (includeTools) {
      payload.tools = getOllamaTools();
      payload.tool_choice = "auto";
    }

    const maxAttempts = 2;
    let lastStatus = null;
    let lastErrorText = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return response.json();
      }

      lastStatus = response.status;
      lastErrorText = await response.text();

      const isRateLimit = response.status === 429;
      const hasRetryLeft = attempt < maxAttempts;

      if (isRateLimit && hasRetryLeft) {
        const retryAfterHeader = Number(response.headers.get("retry-after"));
        const retryAfterFromBodyMatch = lastErrorText.match(
          /try again in\s*([\d.]+)s/i,
        );
        const retryAfterFromBody = retryAfterFromBodyMatch
          ? Number(retryAfterFromBodyMatch[1])
          : Number.NaN;

        const retryAfterSeconds = Number.isFinite(retryAfterHeader)
          ? retryAfterHeader
          : Number.isFinite(retryAfterFromBody)
            ? retryAfterFromBody
            : 2;

        const clampedSeconds = Math.max(1, Math.min(15, retryAfterSeconds));
        await new Promise((resolve) =>
          setTimeout(resolve, Math.round(clampedSeconds * 1000)),
        );
        continue;
      }

      break;
    }

    throw new Error(
      `${config.provider} API error ${lastStatus}: ${String(lastErrorText).substring(0, 250)}`,
    );
  }
}

let aiClient = null;

export function getAIClient() {
  if (!aiClient) {
    aiClient = new AIClient();
  }
  return aiClient;
}

// Backward-compatible export for existing imports.
export const getOllamaClient = getAIClient;

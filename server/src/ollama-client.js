import { Ollama } from 'ollama';
import { getOllamaTools } from "./tools.js";
import { mcpManager } from "./mcp-client.js";

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
- If a tool call fails, explain the error clearly and suggest alternatives.`;

class OllamaClient {
  constructor() {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3.2";
    
    // Create a configured Ollama instance
    this.ollama = new Ollama({ host });
  }

  async chat(userMessage, history = []) {
    // Convert history to Ollama format
    const messages = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    history.forEach((msg) => {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    });

    messages.push({ role: "user", content: userMessage });

    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      const response = await this.ollama.chat({
        model: this.model,
        messages: messages,
        tools: getOllamaTools(),
      });

      // Add the model's message (which could contain text or tool calls) to history
      messages.push(response.message);

      // Check if the model decided to call tools
      if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
        // Return the final text if no tools were called
        return response.message.content || "I processed your request but have no additional response.";
      }

      // Execute each tool call
      for (const tool of response.message.tool_calls) {
        const { name, arguments: args } = tool.function;
        console.log(`🔧 Tool call: ${name}(${JSON.stringify(args)})`);

        let toolResult;
        try {
          toolResult = await mcpManager.executeTool(name, args || {});
        } catch (err) {
          console.error(`❌ Tool error (${name}):`, err.message);
          toolResult = JSON.stringify({ error: err.message });
        }

        console.log(`✅ Tool result (${name}): ${toolResult.substring(0, 200)}...`);

        // Add the tool result back into the message history so the model sees it
        messages.push({
          role: "tool",
          content: toolResult,
        });
      }

      iteration++;
    }

    return "I reached the maximum number of tool executions and couldn't complete your request.";
  }
}

let ollamaClient = null;

export function getOllamaClient() {
  if (!ollamaClient) {
    ollamaClient = new OllamaClient();
  }
  return ollamaClient;
}

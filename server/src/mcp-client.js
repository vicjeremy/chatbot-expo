import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "..", "data", "notes.db");

class MCPClientManager {
  constructor() {
    this.fetchClient = null;
    this.sqliteClient = null;
    this.fetchTransport = null;
    this.sqliteTransport = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    console.log("🔌 Initializing MCP clients...");

    // --- MCP A: Fetch Server (READ external data) ---
    try {
      this.fetchTransport = new StdioClientTransport({
        command: "uvx",
        args: ["mcp-server-fetch"],
      });

      this.fetchClient = new Client({
        name: "chatbot-fetch-client",
        version: "1.0.0",
      });

      await this.fetchClient.connect(this.fetchTransport);
      const fetchTools = await this.fetchClient.listTools();
      console.log(
        "✅ MCP A (Fetch) connected. Tools:",
        fetchTools.tools.map((t) => t.name),
      );
    } catch (err) {
      console.error("❌ Failed to connect MCP A (Fetch):", err.message);
      // We no longer throw, just continue without fetch MCP
      this.fetchClient = null;
    }

    // --- MCP B: SQLite Server (READ/WRITE notes) ---
    try {
      this.sqliteTransport = new StdioClientTransport({
        command: "uvx",
        args: ["mcp-server-sqlite", "--db-path", DB_PATH],
      });

      this.sqliteClient = new Client({
        name: "chatbot-sqlite-client",
        version: "1.0.0",
      });

      await this.sqliteClient.connect(this.sqliteTransport);
      const sqliteTools = await this.sqliteClient.listTools();
      console.log(
        "✅ MCP B (SQLite) connected. Tools:",
        sqliteTools.tools.map((t) => t.name),
      );
    } catch (err) {
      console.error("❌ Failed to connect MCP B (SQLite):", err.message);
      this.sqliteClient = null;
    }

    // Initialize the notes table
    await this.initializeDatabase();
    this.initialized = true;
    console.log("🚀 All MCP clients initialized successfully!");
  }

  async initializeDatabase() {
    console.log("📦 Initializing notes database...");
    await this.sqliteClient.callTool({
      name: "write_query",
      arguments: {
        query: `CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          source_url TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )`,
      },
    });
    console.log("✅ Notes table ready");
  }

  parseTableRows(text) {
    const splitRow = (row) => {
      const parts = row.split("|");
      if (parts[0]?.trim() === "") parts.shift();
      if (parts[parts.length - 1]?.trim() === "") parts.pop();
      return parts.map((part) => part.trim());
    };

    const normalizeHeader = (header) =>
      header
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("|"));

    if (lines.length < 3) return [];

    const headers = splitRow(lines[0]).map(normalizeHeader);
    if (headers.length === 0) return [];

    const separator = lines[1];
    if (!separator.includes("---")) return [];

    return lines.slice(2).map((row) => {
      const cells = splitRow(row);
      const entry = {};

      headers.forEach((header, i) => {
        entry[header] = cells[i] || "";
      });

      return entry;
    });
  }

  parseDelimitedRows(text, delimiter) {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2 || !lines[0].includes(delimiter)) return [];

    const headers = lines[0].split(delimiter).map((h) => h.trim());
    if (headers.length === 0) return [];

    return lines.slice(1).map((line) => {
      const cells = line.split(delimiter).map((c) => c.trim());
      const entry = {};

      headers.forEach((header, i) => {
        entry[header] = cells[i] || "";
      });

      return entry;
    });
  }

  parseSqliteRows(rawText) {
    if (!rawText || typeof rawText !== "string") return [];

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    if (!cleaned) return [];

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to text parsers.
    }

    const tableRows = this.parseTableRows(cleaned);
    if (tableRows.length > 0) return tableRows;

    const tsvRows = this.parseDelimitedRows(cleaned, "\t");
    if (tsvRows.length > 0) return tsvRows;

    const csvRows = this.parseDelimitedRows(cleaned, ",");
    if (csvRows.length > 0) return csvRows;

    return [];
  }

  // --- MCP A Operations (READ) ---

  async fetchWebPage(url) {
    if (!this.fetchClient) throw new Error("Fetch MCP client not initialized");

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }

    const result = await this.fetchClient.callTool({
      name: "fetch",
      arguments: { url },
    });

    // Extract text content from the result
    const textContent = result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    // Truncate extremely long content to avoid token limits
    const maxLength = 8000;
    if (textContent.length > maxLength) {
      return textContent.substring(0, maxLength) + "\n\n[Content truncated...]";
    }

    return textContent;
  }

  // --- MCP B Operations (WRITE) ---

  async saveNote(title, content, sourceUrl = null) {
    if (!this.sqliteClient)
      throw new Error("SQLite MCP client not initialized");

    const id = uuidv4();
    const escapedTitle = title.replace(/'/g, "''");
    const escapedContent = content.replace(/'/g, "''");
    const escapedUrl = sourceUrl
      ? `'${sourceUrl.replace(/'/g, "''")}'`
      : "NULL";

    await this.sqliteClient.callTool({
      name: "write_query",
      arguments: {
        query: `INSERT INTO notes (id, title, content, source_url)
                VALUES ('${id}', '${escapedTitle}', '${escapedContent}', ${escapedUrl})`,
      },
    });

    return { id, title, content, source_url: sourceUrl };
  }

  async listNotes() {
    if (!this.sqliteClient)
      throw new Error("SQLite MCP client not initialized");

    const result = await this.sqliteClient.callTool({
      name: "read_query",
      arguments: {
        query:
          "SELECT id, title, content, source_url, created_at FROM notes ORDER BY created_at DESC",
      },
    });

    const textContent = result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    return this.parseSqliteRows(textContent);
  }

  async searchNotes(keyword) {
    if (!this.sqliteClient)
      throw new Error("SQLite MCP client not initialized");

    const escapedKeyword = keyword.replace(/'/g, "''");

    const result = await this.sqliteClient.callTool({
      name: "read_query",
      arguments: {
        query: `SELECT id, title, content, source_url, created_at FROM notes
                WHERE title LIKE '%${escapedKeyword}%' OR content LIKE '%${escapedKeyword}%'
                ORDER BY created_at DESC`,
      },
    });

    const textContent = result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    return this.parseSqliteRows(textContent);
  }

  async deleteNote(id) {
    if (!this.sqliteClient)
      throw new Error("SQLite MCP client not initialized");

    const escapedId = id.replace(/'/g, "''");

    await this.sqliteClient.callTool({
      name: "write_query",
      arguments: {
        query: `DELETE FROM notes WHERE id = '${escapedId}'`,
      },
    });

    return { deleted: true, id };
  }

  async updateNote(id, title, content) {
    if (!this.sqliteClient)
      throw new Error("SQLite MCP client not initialized");

    const escapedId = id.replace(/'/g, "''");
    const setClauses = [];

    if (title) {
      setClauses.push(`title = '${title.replace(/'/g, "''")}'`);
    }
    if (content) {
      setClauses.push(`content = '${content.replace(/'/g, "''")}'`);
    }

    if (setClauses.length === 0) {
      return { updated: false, reason: "No fields to update" };
    }

    setClauses.push(`updated_at = datetime('now')`);

    await this.sqliteClient.callTool({
      name: "write_query",
      arguments: {
        query: `UPDATE notes SET ${setClauses.join(", ")} WHERE id = '${escapedId}'`,
      },
    });

    return { updated: true, id };
  }

  // Execute a tool call from the AI
  async executeTool(toolName, args) {
    switch (toolName) {
      case "fetch_webpage":
        return await this.fetchWebPage(args.url);
      case "save_note":
        return JSON.stringify(
          await this.saveNote(args.title, args.content, args.source_url),
        );
      case "list_notes":
        return await this.listNotes();
      case "search_notes":
        return await this.searchNotes(args.keyword);
      case "delete_note":
        return JSON.stringify(await this.deleteNote(args.id));
      case "update_note":
        return JSON.stringify(
          await this.updateNote(args.id, args.title, args.content),
        );
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  }

  async shutdown() {
    console.log("🔌 Shutting down MCP clients...");
    try {
      if (this.fetchClient) await this.fetchClient.close();
      if (this.sqliteClient) await this.sqliteClient.close();
    } catch (err) {
      console.error("Error during shutdown:", err.message);
    }
  }
}

// Singleton
export const mcpManager = new MCPClientManager();

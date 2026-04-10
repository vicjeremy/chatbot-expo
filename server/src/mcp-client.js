import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.SQLITE_DB_PATH ||
  path.resolve(__dirname, "..", "data", "notes.db");

class MCPClientManager {
  constructor() {
    this.fetchClient = null;
    this.sqliteClient = null;
    this.fetchTransport = null;
    this.sqliteTransport = null;
    this.initialized = false;
    this.dbPath = DB_PATH;
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
      console.log(`🗄️ SQLite DB path: ${this.dbPath}`);
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

  parsePythonLiteralRows(text) {
    if (
      !text ||
      !(text.startsWith("[") && text.endsWith("]")) ||
      !text.includes("{")
    ) {
      return [];
    }

    // mcp-server-sqlite often returns python-style literals, e.g.:
    // [{'id': '123', 'title': 'Note'}]
    const jsonLike = text
      .replace(/\bNone\b/g, "null")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/([{,]\s*)'([^'\\]*(?:\\.[^'\\]*)*)'\s*:/g, '$1"$2":')
      .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, value) => {
        const unescaped = value.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        const escaped = unescaped
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t");
        return `: \"${escaped}\"`;
      });

    try {
      const parsed = JSON.parse(jsonLike);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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

    const pythonRows = this.parsePythonLiteralRows(cleaned);
    if (pythonRows.length > 0) return pythonRows;

    const tableRows = this.parseTableRows(cleaned);
    if (tableRows.length > 0) return tableRows;

    const tsvRows = this.parseDelimitedRows(cleaned, "\t");
    if (tsvRows.length > 0) return tsvRows;

    const csvRows = this.parseDelimitedRows(cleaned, ",");
    if (csvRows.length > 0) return csvRows;

    return [];
  }

  escapeSqlLiteral(value) {
    return String(value ?? "").replace(/'/g, "''");
  }

  isUuidLike(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "").trim(),
    );
  }

  async runReadQuery(query) {
    const result = await this.sqliteClient.callTool({
      name: "read_query",
      arguments: { query },
    });

    const textContent = result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    return this.parseSqliteRows(textContent);
  }

  async runWriteQuery(query) {
    await this.sqliteClient.callTool({
      name: "write_query",
      arguments: { query },
    });
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

    return this.runReadQuery(
      "SELECT id, title, content, source_url, created_at FROM notes ORDER BY created_at DESC",
    );
  }

  async searchNotes(keyword) {
    if (!this.sqliteClient)
      throw new Error("SQLite MCP client not initialized");

    const escapedKeyword = this.escapeSqlLiteral(keyword);

    return this
      .runReadQuery(`SELECT id, title, content, source_url, created_at FROM notes
                WHERE title LIKE '%${escapedKeyword}%' OR content LIKE '%${escapedKeyword}%'
                ORDER BY created_at DESC`);
  }

  async deleteNote(identifier) {
    if (!this.sqliteClient)
      throw new Error("SQLite MCP client not initialized");

    const rawIdentifier = String(identifier || "").trim();
    if (!rawIdentifier) {
      return {
        deleted: false,
        reason: "Note identifier is required",
      };
    }

    const escapedIdentifier = this.escapeSqlLiteral(rawIdentifier);
    let matches = [];

    if (this.isUuidLike(rawIdentifier)) {
      matches = await this.runReadQuery(`SELECT id, title FROM notes
                 WHERE id = '${escapedIdentifier}'
                 LIMIT 1`);
    } else {
      const exactMatches = await this.runReadQuery(`SELECT id, title FROM notes
                   WHERE lower(title) = lower('${escapedIdentifier}')
                   ORDER BY created_at DESC`);

      if (exactMatches.length > 0) {
        matches = exactMatches;
      } else {
        const partialMatches = await this
          .runReadQuery(`SELECT id, title FROM notes
                     WHERE title LIKE '%${escapedIdentifier}%'
                     ORDER BY created_at DESC
                     LIMIT 5`);
        matches = partialMatches;
      }
    }

    if (matches.length === 0) {
      return {
        deleted: false,
        reason: "No matching note found",
        identifier: rawIdentifier,
      };
    }

    if (matches.length > 1 && !this.isUuidLike(rawIdentifier)) {
      return {
        deleted: false,
        reason: "Multiple notes matched. Please use a note id.",
        identifier: rawIdentifier,
        matches: matches.map((row) => ({ id: row.id, title: row.title })),
      };
    }

    const targetId = matches[0]?.id;
    if (!targetId) {
      return {
        deleted: false,
        reason: "Matched note has no id",
        identifier: rawIdentifier,
      };
    }

    const escapedTargetId = this.escapeSqlLiteral(targetId);

    await this.runWriteQuery(
      `DELETE FROM notes WHERE id = '${escapedTargetId}'`,
    );

    // Verify deletion using listNotes() because its parsing path is already
    // exercised by frontend notes rendering and is more reliable than ad-hoc
    // single-row query parsing variations from MCP output.
    const notesAfterDelete = await this.listNotes();
    const deleted = !notesAfterDelete.some((row) => row.id === targetId);

    return {
      deleted,
      identifier: rawIdentifier,
      id: targetId,
      title: matches[0]?.title || null,
      deletedCount: deleted ? 1 : 0,
      reason: deleted ? null : "Delete query did not remove the record",
    };
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
        return JSON.stringify(
          await this.deleteNote(
            args.id ||
              args.note_id ||
              args.noteId ||
              args.title ||
              args.keyword,
          ),
        );
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

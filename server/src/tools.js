// Tool definitions for the AI model — these map to MCP server capabilities

export const toolDefinitions = [
  {
    name: "fetch_webpage",
    description:
      "Fetch and read the content of a web page given its URL. Use this when the user asks to look up, read, summarize, or research a web page or URL.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The full URL of the web page to fetch (e.g., https://example.com)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "save_note",
    description:
      "Save a note or bookmark to the database. Use this when the user asks to save, bookmark, remember, or store information.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "A short title for the note",
        },
        content: {
          type: "string",
          description: "The full content of the note",
        },
        source_url: {
          type: "string",
          description: "Optional source URL where the information came from",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "list_notes",
    description:
      "List all saved notes and bookmarks. Use this when the user asks to see, show, list, or view their saved notes.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "search_notes",
    description:
      "Search saved notes by keyword. Use this when the user wants to find a specific note.",
    parameters: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "The keyword to search for in note titles and content",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "delete_note",
    description:
      "Delete a saved note by its ID or title. Use this when the user asks to remove or delete a specific note.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the note to delete",
        },
        title: {
          type: "string",
          description:
            "Optional note title to delete when the ID is not provided",
        },
      },
      required: [],
    },
  },
  {
    name: "update_note",
    description:
      "Update the title or content of an existing note. Use this when the user wants to edit or modify a saved note.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the note to update",
        },
        title: {
          type: "string",
          description: "The new title (optional, leave empty to keep current)",
        },
        content: {
          type: "string",
          description:
            "The new content (optional, leave empty to keep current)",
        },
      },
      required: ["id"],
    },
  },
];

// Convert our tool definitions to Ollama function declarations format
export function getOllamaTools() {
  return toolDefinitions.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// API service — connects Expo app to the Node.js backend
// Change BASE_URL to your deployed server URL for production
const BASE_URL = "http://localhost:3001";

class ApiService {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  async sendMessage(message, history = []) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Network error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getNotes() {
    const response = await fetch(`${this.baseUrl}/api/notes`);

    if (!response.ok) {
      throw new Error("Failed to fetch notes");
    }

    return response.json();
  }

  async searchNotes(query) {
    const response = await fetch(
      `${this.baseUrl}/api/notes/search?q=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      throw new Error("Failed to search notes");
    }

    return response.json();
  }

  async deleteNote(id) {
    const response = await fetch(`${this.baseUrl}/api/notes/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete note");
    }

    return response.json();
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();

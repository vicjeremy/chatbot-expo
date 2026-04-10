// API service — connects Expo app to the Node.js backend
// Change BASE_URL to your deployed server URL for production
import { Platform } from "react-native";

function normalizeUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "");
}

function getCandidateBaseUrls() {
  const configured = normalizeUrl(process.env.EXPO_PUBLIC_API_URL);
  if (configured) return [configured];

  if (Platform.OS === "web") {
    const host =
      typeof window !== "undefined" && window?.location?.hostname
        ? window.location.hostname
        : "localhost";

    return [
      `http://${host}:3001`,
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ];
  }

  // Native defaults: Android emulator commonly uses 10.0.2.2.
  return ["http://10.0.2.2:3001", "http://localhost:3001"];
}

class ApiService {
  constructor() {
    this.baseUrls = getCandidateBaseUrls();
    this.baseUrl = this.baseUrls[0];
  }

  setBaseUrl(url) {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    this.baseUrl = normalized;
    this.baseUrls = [normalized];
  }

  async request(path, options = {}) {
    let lastError = null;
    const attempted = [];

    for (const base of this.baseUrls) {
      attempted.push(base);
      try {
        const response = await fetch(`${base}${path}`, options);
        this.baseUrl = base;
        return response;
      } catch (err) {
        lastError = err;
      }
    }

    const details =
      attempted.length > 0 ? ` Tried: ${attempted.join(", ")}.` : "";
    const message =
      `Network request failed.${details} ` +
      "If this is an APK build, set EXPO_PUBLIC_API_URL in the matching EAS environment/profile.";

    throw lastError
      ? new Error(`${message} Root cause: ${lastError.message || "unknown"}`)
      : new Error(message);
  }

  async sendMessage(
    message,
    history = [],
    provider = "groq",
    providerConfig = {},
  ) {
    const response = await this.request(`/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, provider, providerConfig }),
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
    const response = await this.request(`/api/notes`);

    if (!response.ok) {
      throw new Error("Failed to fetch notes");
    }

    return response.json();
  }

  async searchNotes(query) {
    const response = await this.request(
      `/api/notes/search?q=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      throw new Error("Failed to search notes");
    }

    return response.json();
  }

  async deleteNote(id) {
    const response = await this.request(`/api/notes/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete note");
    }

    return response.json();
  }

  async updateNote(id, payload = {}) {
    const response = await this.request(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to update note");
    }

    return response.json();
  }

  async healthCheck() {
    try {
      const response = await this.request(`/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();

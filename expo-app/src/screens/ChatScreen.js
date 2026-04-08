import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
} from "react-native";
import { theme } from "../theme";

const useSafeAreaInsets = () => ({ top: 40, bottom: 20 });

import { MessageBubble, TypingIndicator } from "../components/MessageBubble";
import { api } from "../services/api";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    '👋 Hi! I\'m your AI Research Assistant.\n\n🔍 I can **fetch & summarize** any web page\n📝 I can **save notes** from our conversations\n📋 I can **manage your notes** (list, search, edit, delete)\n\nTry: "Fetch https://example.com" or "Show my notes"',
  timestamp: new Date().toISOString(),
};

const PROVIDERS = [
  { key: "ollama", label: "Ollama" },
  { key: "gemini", label: "Gemini" },
  { key: "groq", label: "Groq" },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [providerConfig, setProviderConfig] = useState({
    geminiApiKey: "",
    groqApiKey: "",
    ollamaModel: "",
    geminiModel: "",
    groqModel: "",
  });
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  const updateProviderConfig = useCallback((key, value) => {
    setProviderConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Build history from messages (exclude welcome message)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: text });

      const data = await api.sendMessage(
        text,
        history,
        selectedProvider,
        providerConfig,
      );

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `⚠️ ${err.message || "Failed to connect. Is the server running?"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, providerConfig, selectedProvider]);

  const renderItem = useCallback(
    ({ item }) => <MessageBubble message={item} />,
    [],
  );
  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerIcon}>🤖</Text>
          <View>
            <Text style={styles.headerTitle}>Research Assistant</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isLoading
                      ? theme.colors.warning
                      : theme.colors.success,
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {isLoading ? "Thinking..." : "Online"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.providerRow}>
          {PROVIDERS.map((provider) => {
            const selected = provider.key === selectedProvider;
            return (
              <TouchableOpacity
                key={provider.key}
                style={[
                  styles.providerChip,
                  selected && styles.providerChipSelected,
                ]}
                onPress={() => setSelectedProvider(provider.key)}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.providerChipText,
                    selected && styles.providerChipTextSelected,
                  ]}
                >
                  {provider.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.settingsChip}
            onPress={() => setIsSettingsOpen(true)}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsChipText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isSettingsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Provider Settings</Text>
            <Text style={styles.modalSubtitle}>
              Enter keys and model names here instead of editing server env
              files.
            </Text>

            <Text style={styles.fieldLabel}>Ollama Model (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={providerConfig.ollamaModel}
              onChangeText={(value) =>
                updateProviderConfig("ollamaModel", value)
              }
              placeholder="qwen3.5:4b"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Gemini API Key</Text>
            <TextInput
              style={styles.fieldInput}
              value={providerConfig.geminiApiKey}
              onChangeText={(value) =>
                updateProviderConfig("geminiApiKey", value)
              }
              placeholder="AIza..."
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              secureTextEntry
            />

            <Text style={styles.fieldLabel}>Gemini Model (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={providerConfig.geminiModel}
              onChangeText={(value) =>
                updateProviderConfig("geminiModel", value)
              }
              placeholder="gemini-2.0-flash"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Groq API Key</Text>
            <TextInput
              style={styles.fieldInput}
              value={providerConfig.groqApiKey}
              onChangeText={(value) =>
                updateProviderConfig("groqApiKey", value)
              }
              placeholder="gsk_..."
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              secureTextEntry
            />

            <Text style={styles.fieldLabel}>Groq Model (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={providerConfig.groqModel}
              onChangeText={(value) => updateProviderConfig("groqModel", value)}
              placeholder="llama-3.1-8b-instant"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() =>
                  setProviderConfig({
                    geminiApiKey: "",
                    groqApiKey: "",
                    ollamaModel: "",
                    geminiModel: "",
                    groqModel: "",
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.modalSecondaryButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => setIsSettingsOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalPrimaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListFooterComponent={isLoading ? <TypingIndicator /> : null}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask anything or paste a URL..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={4000}
              onSubmitEditing={Platform.OS !== "web" ? sendMessage : undefined}
              onKeyPress={
                Platform.OS === "web"
                  ? (e) => {
                      if (
                        e.nativeEvent.key === "Enter" &&
                        !e.nativeEvent.shiftKey
                      ) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }
                  : undefined
              }
              returnKeyType="send"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  providerRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  providerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLight,
  },
  providerChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  providerChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  providerChipTextSelected: {
    color: "#FFF",
  },
  settingsChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  settingsChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    color: theme.colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    fontSize: 13,
  },
  modalActions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalSecondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLight,
  },
  modalSecondaryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  modalPrimaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  modalPrimaryButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  messageList: {
    paddingVertical: 12,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radius.xl,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceGlass,
  },
  sendIcon: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
});

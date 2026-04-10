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
import { MessageBubble, TypingIndicator } from "../components/MessageBubble";
import { api } from "../services/api";

const useSafeAreaInsets = () => ({ top: 40, bottom: 20 });

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "I can synthesize links, summarize notes, and map trends. Ask me to fetch a URL, compare ideas, or save insights to your knowledge base.",
  timestamp: new Date().toISOString(),
};

const PROVIDERS = [
  { key: "ollama", label: "Ollama" },
  { key: "gemini", label: "Gemini" },
  { key: "groq", label: "Groq" },
];

const RESEARCH_CHIPS = [
  "Analyze RWA Protocols",
  "L2 Transaction Trends",
  "Top 5 Yield Strategies",
];

export default function ChatScreen() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("groq");
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
        content: `Connection issue: ${err.message || "Server is not responding."}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, providerConfig, selectedProvider]);

  const quickPrompt = useCallback((text) => {
    setInputText(text);
  }, []);

  const renderItem = useCallback(
    ({ item }) => <MessageBubble message={item} />,
    [],
  );
  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerOverlay} />

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
          <Text style={styles.iconGlyph}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Curator AI</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsSettingsOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.iconGlyph}>⚙</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.timeMarker}>Today</Text>

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
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.providerChipText,
                  selected && styles.providerChipTextActive,
                ]}
              >
                {provider.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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

      <View style={styles.chipRow}>
        {RESEARCH_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={styles.researchChip}
            onPress={() => quickPrompt(chip)}
            activeOpacity={0.85}
          >
            <Text style={styles.researchChipText}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <View
          style={[
            styles.composerWrap,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <TouchableOpacity style={styles.plusButton} activeOpacity={0.8}>
            <Text style={styles.plusButtonText}>＋</Text>
          </TouchableOpacity>

          <View style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask Curator AI..."
              placeholderTextColor="rgba(199,196,215,0.45)"
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
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.sendGlyph}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={isSettingsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Provider Settings</Text>

            <Text style={styles.fieldLabel}>Ollama Model</Text>
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

            <Text style={styles.fieldLabel}>Gemini Model</Text>
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

            <Text style={styles.fieldLabel}>Groq Model</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    backgroundColor: "rgba(12, 13, 22, 0.55)",
  },
  headerBar: {
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(53,52,57,0.4)",
  },
  iconGlyph: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  headerTitle: {
    color: theme.colors.primary,
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  timeMarker: {
    textAlign: "center",
    color: "rgba(199,196,215,0.42)",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 11,
    marginBottom: 10,
  },
  providerRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  providerChip: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  providerChipSelected: {
    backgroundColor: "rgba(64,239,183,0.2)",
  },
  providerChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  providerChipTextActive: {
    color: theme.colors.secondary,
  },
  messageList: {
    paddingVertical: 8,
    paddingBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  researchChip: {
    backgroundColor: theme.colors.surfaceHighest,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  researchChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  composerWrap: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 30,
    backgroundColor: "rgba(53,52,57,0.6)",
    borderWidth: 1,
    borderColor: "rgba(70,69,84,0.45)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    ...theme.shadows.ambient,
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceContainer,
  },
  plusButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "600",
  },
  inputShell: {
    flex: 1,
    marginHorizontal: 8,
    maxHeight: 120,
  },
  input: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 24,
    paddingVertical: 10,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primaryContainer,
    marginBottom: 3,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendGlyph: {
    color: "#0d0096",
    fontSize: 18,
    marginLeft: 2,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 4,
  },
  fieldInput: {
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    color: theme.colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 13,
  },
  modalActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalSecondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLow,
  },
  modalSecondaryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  modalPrimaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryContainer,
  },
  modalPrimaryButtonText: {
    color: "#0d0096",
    fontSize: 13,
    fontWeight: "800",
  },
});

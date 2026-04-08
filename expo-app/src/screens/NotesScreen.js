import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import { theme } from "../theme";

const useSafeAreaInsets = () => ({ top: 40, bottom: 20 });

import { api } from "../services/api";

function parseTableNotes(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("|"));

  if (lines.length < 3) return [];

  const headerLine = lines[0];
  const separatorLine = lines[1];

  if (!separatorLine.includes("---")) {
    return [];
  }

  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);

  if (headers.length === 0) {
    return [];
  }

  return lines.slice(2).map((row, index) => {
    const cells = row
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    const note = { id: `row-${index}` };
    headers.forEach((header, i) => {
      note[header] = cells[i] || "";
    });

    return note;
  });
}

function parseNotesResponse(rawNotes) {
  if (Array.isArray(rawNotes)) {
    return rawNotes;
  }

  if (typeof rawNotes !== "string" || !rawNotes.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawNotes);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Continue with alternate parser.
  }

  return parseTableNotes(rawNotes);
}

export default function NotesScreen({ isActive = true }) {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const insets = useSafeAreaInsets();

  const fetchNotes = useCallback(async () => {
    try {
      const data = await api.getNotes();
      const parsed = parseNotesResponse(data.notes);
      setNotes(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.log("Failed to fetch notes:", err.message);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      fetchNotes();
    }
  }, [fetchNotes, isActive]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  }, [fetchNotes]);

  const handleDelete = useCallback((id, title) => {
    Alert.alert("Delete Note", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteNote(id);
            setNotes((prev) => prev.filter((n) => n.id !== id));
          } catch (err) {
            Alert.alert("Error", "Failed to delete note.");
          }
        },
      },
    ]);
  }, []);

  const filteredNotes = notes.filter((note) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (note.title && note.title.toLowerCase().includes(q)) ||
      (note.content && note.content.toLowerCase().includes(q))
    );
  });

  const renderNote = useCallback(
    ({ item }) => {
      const isExpanded = expandedId === item.id;

      return (
        <TouchableOpacity
          style={styles.noteCard}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.noteHeader}>
            <View style={styles.noteTitleRow}>
              <Text style={styles.noteIcon}>📝</Text>
              <Text
                style={styles.noteTitle}
                numberOfLines={isExpanded ? undefined : 1}
              >
                {item.title || "Untitled Note"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id, item.title)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={styles.noteContent}
            numberOfLines={isExpanded ? undefined : 2}
          >
            {item.content || ""}
          </Text>

          {item.source_url && (
            <View style={styles.sourceRow}>
              <Text style={styles.sourceIcon}>🔗</Text>
              <Text style={styles.sourceUrl} numberOfLines={1}>
                {item.source_url}
              </Text>
            </View>
          )}

          <Text style={styles.noteDate}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </Text>
        </TouchableOpacity>
      );
    },
    [expandedId, handleDelete],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 My Notes</Text>
        <Text style={styles.headerSubtitle}>
          {notes.length} note{notes.length !== 1 ? "s" : ""} saved
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes..."
            placeholderTextColor={theme.colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        renderItem={renderNote}
        keyExtractor={(item, index) => item.id || `note-${index}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptySubtitle}>
              Chat with the assistant and ask it to save notes for you!
            </Text>
          </View>
        }
      />
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  clearIcon: {
    color: theme.colors.textMuted,
    fontSize: 16,
    padding: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  noteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  noteTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  noteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIcon: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: "600",
  },
  noteContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sourceIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  sourceUrl: {
    fontSize: 12,
    color: theme.colors.primaryLight,
    flex: 1,
  },
  noteDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});

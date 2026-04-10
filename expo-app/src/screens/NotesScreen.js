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
  Modal,
} from "react-native";
import { theme } from "../theme";
import { api } from "../services/api";

const useSafeAreaInsets = () => ({ top: 40, bottom: 20 });

const FILTERS = [
  "All Files",
  "Quantum Computing",
  "Neural Architecture",
  "Ethics in AI",
  "Market Synthesis",
];

function parseTableNotes(text) {
  const splitTableRow = (row) => {
    const parts = row.split("|");
    if (parts[0]?.trim() === "") parts.shift();
    if (parts[parts.length - 1]?.trim() === "") parts.pop();
    return parts.map((part) => part.trim());
  };

  const normalizeHeader = (header) => {
    const key = header
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    if (key === "sourceurl" || key === "source") return "source_url";
    if (key === "createdat" || key === "created") return "created_at";
    if (key === "updatedat" || key === "updated") return "updated_at";
    return key;
  };

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

  const headers = splitTableRow(headerLine).map(normalizeHeader);

  if (headers.length === 0) {
    return [];
  }

  return lines.slice(2).map((row, index) => {
    const cells = splitTableRow(row);

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

  const normalizedRaw = rawNotes
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(normalizedRaw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Keep fallback parsing.
  }

  return parseTableNotes(normalizedRaw);
}

export default function NotesScreen({ isActive = true }) {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All Files");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
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

  const handleDelete = useCallback(
    (id, title) => {
      Alert.alert("Delete Note", `Delete \"${title}\"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteNote(id);
              setExpandedId((current) => (current === id ? null : current));
              await fetchNotes();
            } catch {
              Alert.alert("Error", "Failed to delete note.");
            }
          },
        },
      ]);
    },
    [fetchNotes],
  );

  const openEditModal = useCallback((note) => {
    setEditId(String(note.id || ""));
    setEditTitle(note.title || "");
    setEditContent(note.content || "");
    setEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditId("");
    setEditTitle("");
    setEditContent("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    const id = editId.trim();
    const title = editTitle.trim();
    const content = editContent.trim();

    if (!id) {
      Alert.alert("Error", "Missing note id.");
      return;
    }

    if (!title || !content) {
      Alert.alert("Validation", "Title and content cannot be empty.");
      return;
    }

    try {
      await api.updateNote(id, { title, content });
      await fetchNotes();
      closeEditModal();
    } catch {
      Alert.alert("Error", "Failed to update note.");
    }
  }, [closeEditModal, editContent, editId, editTitle, fetchNotes]);

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = !searchQuery
      ? true
      : (note.title &&
          note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (note.content &&
          note.content.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedFilter === "All Files") {
      return matchesSearch;
    }

    const source = `${note.title || ""} ${note.content || ""}`.toLowerCase();
    return (
      matchesSearch &&
      source.includes(selectedFilter.toLowerCase().split(" ")[0])
    );
  });

  const renderNote = useCallback(
    ({ item }) => {
      const isExpanded = expandedId === item.id;
      const dateLabel = item.created_at
        ? new Date(item.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "No Date";

      return (
        <TouchableOpacity
          style={[styles.noteCard, isExpanded && styles.noteCardExpanded]}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.88}
        >
          <View style={styles.badgeRow}>
            <Text style={styles.noteBadge}>Thread</Text>
            <Text style={styles.noteDate}>{dateLabel}</Text>
          </View>

          <Text
            style={styles.noteTitle}
            numberOfLines={isExpanded ? undefined : 2}
          >
            {item.title || "Untitled Synthesis"}
          </Text>

          <Text
            style={styles.noteContent}
            numberOfLines={isExpanded ? undefined : 4}
          >
            {item.content || ""}
          </Text>

          {item.source_url ? (
            <Text style={styles.sourceUrl} numberOfLines={1}>
              {item.source_url}
            </Text>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionDanger]}
              onPress={() => handleDelete(item.id, item.title || "Untitled")}
            >
              <Text style={[styles.actionButtonText, styles.actionDangerText]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [expandedId, handleDelete, openEditModal],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerArea}>
        <Text style={styles.breadcrumb}>Home / Knowledge Base</Text>
        <Text style={styles.heroTitle}>Curated Intelligence.</Text>
        <Text style={styles.heroSubtitle}>
          Deep research archives organized by neural relevance and
          cross-referenced insights.
        </Text>

        <View style={styles.searchShell}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search knowledge..."
            placeholderTextColor="rgba(199,196,215,0.45)"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearIcon}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={FILTERS}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const selected = selectedFilter === item;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selected && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedFilter(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selected && styles.filterChipTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

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
            <Text style={styles.emptyTitle}>No Research Artifacts Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a chat and ask Curator AI to save insights, then they will
              appear here.
            </Text>
          </View>
        }
      />

      <Modal
        visible={editModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Note</Text>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.fieldInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Note title"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Content</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMultiline]}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="Note content"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={closeEditModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleSaveEdit}
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
  headerArea: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  breadcrumb: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 45,
    letterSpacing: -1,
  },
  heroSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: "92%",
  },
  searchShell: {
    marginTop: 14,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.full,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  searchIcon: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    paddingVertical: 11,
  },
  clearIcon: {
    color: theme.colors.textMuted,
    fontSize: 20,
    lineHeight: 20,
    padding: 4,
  },
  filtersList: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 4,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceHighest,
  },
  filterChipSelected: {
    backgroundColor: "rgba(64,239,183,0.24)",
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextSelected: {
    color: theme.colors.secondary,
  },
  list: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 10,
  },
  noteCard: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.radius.xl,
    padding: 16,
    marginBottom: 12,
  },
  noteCardExpanded: {
    backgroundColor: theme.colors.surfaceHigh,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  noteBadge: {
    color: theme.colors.primary,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "800",
    backgroundColor: "rgba(192,193,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  noteDate: {
    color: theme.colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  noteTitle: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.3,
    fontWeight: "800",
  },
  noteContent: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  sourceUrl: {
    marginTop: 10,
    color: theme.colors.primary,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8,
  },
  actionButton: {
    backgroundColor: theme.colors.surfaceHighest,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  actionDanger: {
    backgroundColor: "rgba(255,180,171,0.12)",
  },
  actionDangerText: {
    color: theme.colors.error,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: theme.colors.primary,
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 12,
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceLow,
    color: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  fieldInputMultiline: {
    minHeight: 120,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  modalSecondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalSecondaryButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  modalPrimaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryContainer,
  },
  modalPrimaryButtonText: {
    color: "#0d0096",
    fontWeight: "800",
  },
});

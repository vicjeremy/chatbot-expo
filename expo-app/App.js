import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import ChatScreen from "./src/screens/ChatScreen";
import NotesScreen from "./src/screens/NotesScreen";
import { theme } from "./src/theme";

function TabIcon({ icon, label, focused, onPress }) {
  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.tabBadge, focused && styles.tabBadgeActive]}>
        <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
          {icon}
        </Text>
      </View>
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Screens */}
      <View style={styles.screenContainer}>
        <View
          style={[
            styles.tabScreen,
            activeTab === "chat" ? styles.visibleScreen : styles.hiddenScreen,
          ]}
        >
          <ChatScreen isActive={activeTab === "chat"} />
        </View>
        <View
          style={[
            styles.tabScreen,
            activeTab === "notes" ? styles.visibleScreen : styles.hiddenScreen,
          ]}
        >
          <NotesScreen isActive={activeTab === "notes"} />
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TabIcon
          icon="◉"
          label="Chat"
          focused={activeTab === "chat"}
          onPress={() => setActiveTab("chat")}
        />
        <TabIcon
          icon="◈"
          label="Notes"
          focused={activeTab === "notes"}
          onPress={() => setActiveTab("notes")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenContainer: {
    flex: 1,
    position: "relative",
  },
  tabScreen: {
    ...StyleSheet.absoluteFillObject,
  },
  visibleScreen: {
    opacity: 1,
    pointerEvents: "auto",
  },
  hiddenScreen: {
    opacity: 0,
    pointerEvents: "none",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    backgroundColor: "rgba(19,19,23,0.94)",
    borderTopColor: "rgba(192,193,255,0.12)",
    borderTopWidth: 1,
    height: 78,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeActive: {
    backgroundColor: "rgba(192,193,255,0.14)",
  },
  tabIcon: {
    fontSize: 16,
    opacity: 0.6,
    color: theme.colors.textSecondary,
  },
  tabIconActive: {
    opacity: 1,
    color: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(199,196,215,0.62)",
    marginTop: 1,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: theme.colors.primary,
  },
});

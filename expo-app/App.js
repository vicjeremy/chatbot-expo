import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import ChatScreen from "./src/screens/ChatScreen";
import NotesScreen from "./src/screens/NotesScreen";

const darkTheme = {
  colors: {
    primary: "#6C63FF",
    background: "#0F0F1A",
    card: "#1A1A2E",
    text: "#EAEAEA",
    border: "#2A2A45",
    notification: "#FF6B6B",
  },
};

function TabIcon({ icon, label, focused, onPress }) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
        {icon}
      </Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
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
        {activeTab === "chat" ? <ChatScreen /> : <NotesScreen />}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TabIcon
          icon="💬"
          label="Chat"
          focused={activeTab === "chat"}
          onPress={() => setActiveTab("chat")}
        />
        <TabIcon
          icon="📋"
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
    backgroundColor: darkTheme.colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: darkTheme.colors.card,
    borderTopColor: darkTheme.colors.border,
    borderTopWidth: 1,
    height: 65,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: "#5A5A7A",
    marginTop: 2,
  },
  tabLabelActive: {
    color: darkTheme.colors.primary,
    fontWeight: "600",
  },
});

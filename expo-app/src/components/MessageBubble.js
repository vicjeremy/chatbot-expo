import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { theme } from "../theme";

export function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      {!isUser ? (
        <View style={styles.aiBlock}>
          <View style={styles.aiHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>✦</Text>
            </View>
            <Text style={styles.aiLabel}>Curator Engine</Text>
          </View>
          <View style={[styles.bubble, styles.aiBubble]}>
            <Text style={[styles.messageText, styles.aiText]} selectable>
              {message.content}
            </Text>
            <Text style={[styles.timestamp, styles.aiTimestamp]}>
              {timestamp}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.userMessageWrap}>
          <View style={[styles.bubble, styles.userBubble]}>
            <Text style={[styles.messageText, styles.userText]} selectable>
              {message.content}
            </Text>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>
          <View style={[styles.avatar, styles.userAvatar]}>
            <Text style={styles.avatarText}>•</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function TypingIndicator() {
  const dot1 = React.useRef(new Animated.Value(0)).current;
  const dot2 = React.useRef(new Animated.Value(0)).current;
  const dot3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 360,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 360,
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 140);
    const a3 = animate(dot3, 280);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={[styles.container, styles.aiContainer]}>
      <View style={styles.aiBlock}>
        <View style={styles.aiHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>✦</Text>
          </View>
          <Text style={styles.aiLabel}>Curator Engine</Text>
        </View>
        <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
          <View style={styles.dotsContainer}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    transform: [
                      {
                        translateY: dot.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -4],
                        }),
                      },
                    ],
                    opacity: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 1],
                    }),
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 18,
  },
  userContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  aiContainer: {
    flexDirection: "column",
  },
  userMessageWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  aiBlock: {
    width: "100%",
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  aiLabel: {
    color: theme.colors.secondary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(128,131,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatar: {
    backgroundColor: "rgba(192,193,255,0.15)",
    marginLeft: 8,
  },
  avatarText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  bubble: {
    maxWidth: "88%",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: theme.radius.xl,
  },
  userBubble: {
    backgroundColor: theme.colors.userBubble,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
  },
  aiBubble: {
    backgroundColor: theme.colors.aiBubble,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(70,69,84,0.3)",
    ...theme.shadows.ambient,
  },
  messageText: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: "500",
  },
  userText: {
    color: theme.colors.userBubbleText,
  },
  aiText: {
    color: theme.colors.aiBubbleText,
  },
  timestamp: {
    marginTop: 8,
    fontSize: 11,
    letterSpacing: 0.3,
    color: "rgba(199,196,215,0.45)",
    textAlign: "right",
  },
  aiTimestamp: {
    color: "rgba(199,196,215,0.4)",
  },
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    maxWidth: 120,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary,
  },
});

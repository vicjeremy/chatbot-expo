import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { theme } from "../theme";

export function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
      )}
      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
      >
        <Text
          style={[styles.messageText, isUser ? styles.userText : styles.aiText]}
          selectable
        >
          {message.content}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      {isUser && (
        <View style={[styles.avatar, styles.userAvatar]}>
          <Text style={styles.avatarText}>👤</Text>
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
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={[styles.container, styles.aiContainer]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>🤖</Text>
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
                        outputRange: [0, -6],
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 12,
    alignItems: "flex-end",
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  aiContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  userAvatar: {
    backgroundColor: theme.colors.primaryDark,
    marginLeft: 8,
  },
  avatarText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.radius.xl,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  userBubble: {
    backgroundColor: theme.colors.userBubble,
    borderBottomRightRadius: 6,
    marginRight: 0,
    ...theme.shadows.md,
    ...theme.shadows.glow,
    borderColor: "rgba(255,255,255,0.2)",
  },
  aiBubble: {
    backgroundColor: theme.colors.aiBubble,
    borderBottomLeftRadius: 6,
    marginLeft: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  userText: {
    color: theme.colors.userBubbleText,
  },
  aiText: {
    color: theme.colors.aiBubbleText,
  },
  timestamp: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: "right",
  },
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
});

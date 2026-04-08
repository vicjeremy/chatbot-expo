// Theme system — dark mode with glassmorphism accents
export const theme = {
  colors: {
    // Primary palette
    primary: "#6C63FF",
    primaryLight: "#8B83FF",
    primaryDark: "#4A42E0",

    // Accent
    accent: "#00D4AA",
    accentLight: "#33DDBB",
    warning: "#FFB347",
    error: "#FF6B6B",
    success: "#4ECDC4",

    // Backgrounds
    background: "#0F0F1A",
    surface: "#1A1A2E",
    surfaceLight: "#252540",
    surfaceGlass: "rgba(30, 30, 60, 0.7)",

    // Text
    text: "#EAEAEA",
    textSecondary: "#9A9AB0",
    textMuted: "#5A5A7A",

    // Chat bubbles
    userBubble: "#6C63FF",
    userBubbleText: "#FFFFFF",
    aiBubble: "#1E1E3A",
    aiBubbleText: "#EAEAEA",

    // Borders
    border: "#2A2A45",
    borderLight: "#3A3A55",
  },

  fonts: {
    regular: "System",
    bold: "System",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    md: {
      shadowColor: "#6C63FF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

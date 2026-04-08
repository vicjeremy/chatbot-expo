// Theme system — ultra-premium dark mode with glassmorphism 
export const theme = {
  colors: {
    // Primary palette
    primary: "#7A6CFF",
    primaryLight: "#9B92FF",
    primaryDark: "#4E42D4",

    // Accent
    accent: "#00F0FF",
    accentLight: "#5CFFF5",
    warning: "#FFBE0B",
    error: "#FF006E",
    success: "#06D6A0",

    // Backgrounds (Deep OLED aesthetic)
    background: "#08080C",
    surface: "#12121A",
    surfaceLight: "#1F1F2E",
    surfaceGlass: "rgba(18, 18, 26, 0.7)",

    // Text
    text: "#F8F9FA",
    textSecondary: "#A0A0B0",
    textMuted: "#60607A",

    // Chat bubbles
    userBubble: "#7A6CFF",
    userBubbleText: "#FFFFFF",
    aiBubble: "#1A1A24",
    aiBubbleText: "#F8F9FA",

    // Borders
    border: "rgba(255, 255, 255, 0.08)",
    borderLight: "rgba(255, 255, 255, 0.15)",
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
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
    md: {
      shadowColor: "#7A6CFF",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 10,
    },
    glow: {
      shadowColor: "#00F0FF",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 15,
    }
  },
};

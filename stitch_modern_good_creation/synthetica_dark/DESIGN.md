# Design System Specification

## 1. Overview & Creative North Star: "The Digital Curator"

This design system is engineered to feel less like a standard software interface and more like a high-end, intelligent workspace. We move beyond the "grid-of-boxes" paradigm to embrace an editorial-inspired layout that emphasizes depth, focus, and intellectual authority.

**The Creative North Star: The Digital Curator.**
The Curator is professional yet visionary. It doesn't overwhelm the user with noisy borders or flat surfaces; it guides the eye through **intentional asymmetry**, high-contrast typography scales, and a sense of physical layering. By utilizing generous whitespace and overlapping "glass" containers, we create an environment where AI research feels sophisticated and fluid, rather than mechanical. This is not just a tool; it is a premium cognitive environment.

---

## 2. Colors

The palette is rooted in a deep charcoal foundation, punctuated by "Electric Blue" and "Soft Violet" to signify intelligence and action.

### Tonal Foundations
*   **Primary (`#c0c1ff`):** The "Electric" spark. Used for critical actions and active states.
*   **Secondary (`#40efb7`):** The "Assistant" green. Used for success states, online indicators, and AI-specific highlights.
*   **Tertiary (`#cebdff`):** The "Soft Violet." Used for secondary research paths and subtle accents.
*   **Background (`#131317`):** A deep, ink-like canvas that provides the necessary depth for glassmorphism.

### The "No-Line" Rule
To maintain a premium, editorial feel, **1px solid borders are strictly prohibited for sectioning.** We do not define space with strokes. Instead, boundaries must be established via:
*   **Background Shifts:** Transitioning from `surface` to `surface-container-low`.
*   **Tonal Transitions:** Using soft gradients or subtle shifts in lightness to imply containment.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Each layer represents a step deeper into the research process.
*   **Layer 0 (Base):** `surface`
*   **Layer 1 (Main Content Area):** `surface-container-low`
*   **Layer 2 (Interactive Cards):** `surface-container-high`
*   **Layer 3 (Floating Overlays):** `surface-container-highest`

### The "Glass & Gradient" Rule
For floating elements (modals, active AI chat bubbles), apply **Glassmorphism**:
*   **Color:** `surface-variant` with 60% opacity.
*   **Backdrop Blur:** 12px to 20px.
*   **Soulful Gradients:** Main CTAs should use a subtle linear gradient from `primary` to `primary-container` at a 135-degree angle to provide a tactile, glowing quality.

---

## 3. Typography

The system utilizes a dual-font strategy to balance character with readability.

*   **Display & Headlines (Space Grotesk):** This typeface provides a technical, modern edge. Use `display-lg` (3.5rem) for hero titles to create an authoritative, editorial impact.
*   **Body & Labels (Inter / -apple-system):** Chosen for its exceptional legibility at small sizes. 
*   **Hierarchy as Identity:** We use extreme scale differences. A `display-sm` header paired with a `body-md` description creates a "Modernist" aesthetic that emphasizes the hierarchy of information.

---

## 4. Elevation & Depth

We achieve hierarchy through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Place a `surface-container-lowest` card on top of a `surface-container-low` background to create a "recessed" look, or `surface-container-highest` on `surface` for a "lifted" look.
*   **Ambient Shadows:** For floating elements, use extra-diffused shadows.
    *   *Example:* `0px 20px 40px rgba(0, 0, 0, 0.08)`. The shadow should feel like a soft glow of dark light, never a harsh line.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` token at **15% opacity**. This creates a "barely-there" guide that respects the "No-Line" rule.
*   **Glassmorphism Depth:** When using glass effects, the `surface-tint` should be applied at 5% opacity to "warm" the glass with the primary brand color, making the UI feel cohesive.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary-container`. `9999px` (Full) roundedness. No border.
*   **Secondary:** Glass-style. `surface-container-high` background with 40% opacity and a "Ghost Border."
*   **Tertiary:** Transparent background, `primary` text, with a subtle underline transition on hover.

### Input Fields
*   **Structure:** `surface-container-low` background with `xl` (1.5rem) roundedness.
*   **State:** On focus, the "Ghost Border" increases to 40% opacity with a subtle `primary` glow.
*   **Layout:** Remove the label from the box; use `label-md` placed 8px above the input for a clean, professional look.

### Cards & Chat Bubbles
*   **Rule:** Forbid divider lines. Use `surface-container-high` for user messages and a "Glass" `surface-variant` for AI responses.
*   **Spacing:** Use `lg` (1rem) or `xl` (1.5rem) spacing internally to allow the content to breathe.

### Research Chips
*   **Selection:** Use `secondary_container` for the active state with `on_secondary_container` text.
*   **Unselected:** `surface_container_highest` with `on_surface_variant` text.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts (e.g., a wide left column for research and a narrow right column for sources).
*   **Do** leverage `display-lg` typography for empty states to make them feel like "Art" rather than "Errors."
*   **Do** use `secondary` (#40efb7) sparingly as a "pulse" to indicate the AI is thinking or active.

### Don't
*   **Don't** use 100% white (#FFFFFF) for body text. Use `on_surface_variant` (#c7c4d7) to reduce eye strain in dark mode.
*   **Don't** use standard "Drop Shadows." Stick to Tonal Layering and Ambient Shadows.
*   **Don't** use hard corners. Every element should follow the Roundedness Scale, primarily `md` (0.75rem) and `xl` (1.5rem).
*   **Don't** use vertical dividers. Use whitespace to separate ideas.
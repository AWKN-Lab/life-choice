# Design System Specification: Neo-Mysticism & The Ethereal Interface

## 1. Overview & Creative North Star: "The Celestial Curator"
The design system is built upon the "Celestial Curator" North Star. We are moving away from the "flat, dark-mode dashboard" trope toward an editorial, high-end experience that feels like a physical sanctuary for the digital age. This system rejects rigid, boxed layouts in favor of **intentional asymmetry, depth through light, and organic breathing room.**

By blending the ancestral weight of elegant Serif typography with the futuristic shimmer of "Holographic Gold" and glassmorphism, we create a "Neo-Mysticism" aesthetic. The goal is to make the user feel as if they are interacting with a living, breathing artifact—one that is both mystical and technologically superior.

---

## 2. Colors & Surface Philosophy
We avoid pure black (#000000) to prevent visual "dead zones." Instead, we use an obsidian-depth palette that allows for light to travel through the interface.

### The Obsidian Foundation
*   **Surface (Background):** `#10141a` (Obsidian Deep)
*   **Surface Tiers:** Use `surface_container_lowest` (#0a0e14) to create "wells" of content, and `surface_container_highest` (#31353c) for elevated floating elements.

### The Holographic & Electric Accents
*   **Primary (Champagne Gold):** `#dacf98` (The "Glow"). Use this for primary brand moments and key headlines.
*   **Secondary (Electric Violet):** `#d7baff`. Reserved for High-Intent CTAs. It should feel like a pulse of energy against the dark background.
*   **Tertiary (Aurora Green):** `#00eab2`. Used for success states, growth indicators, or "active" mystical states.

### Guidelines for Color Usage
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for layout sectioning. Separation must be achieved via background shifts (e.g., a `surface_container_low` section nestled within the main `surface`).
*   **Signature Textures:** For primary buttons and hero elements, do not use flat colors. Use a linear gradient: `primary` (#dacf98) to `primary_container` (#beb47e) at a 135-degree angle to simulate a "champagne silk" finish.
*   **The Glass Rule:** Any floating overlay (modals, navigation bars) must use `surface_bright` at 60% opacity with a `24px` backdrop-blur.

---

## 3. Typography: The Editorial Contrast
The system uses a high-contrast pairing to balance ancient wisdom (Serif) with modern precision (Sans).

*   **Display & Headlines (Noto Serif SC):** These are the "Soul" of the UI. Use `display-lg` (3.5rem) with wide letter-spacing (-0.02em) for hero moments. The Serif should feel authoritative and timeless.
*   **Body & Titles (Manrope):** The "Machine." Manrope provides high legibility. Use `body-lg` (1rem) for general reading to ensure the mystical aesthetic doesn't compromise the user's ability to digest information.
*   **Hierarchy Note:** All `label` styles must be in All-Caps with +0.1em letter-spacing to create a "technical" or "alchemical" annotation feel.

---

## 4. Elevation & Depth: Tonal Layering
In this design system, shadows are not "darkness"—they are "voids" or "ambience."

*   **The Layering Principle:** Stacking should follow a natural logic. 
    *   *Base:* `surface`
    *   *Recessed Content:* `surface_container_lowest`
    *   *Floating Cards:* `surface_container_high`
*   **Ambient Shadows:** Use `on_surface` color for shadows at 6% opacity, with a blur radius of `40px` and a `Y-offset` of `20px`. This creates a soft, foggy lift rather than a harsh drop shadow.
*   **The "Ghost Border" Fallback:** If a container requires definition against a similar background, use `outline_variant` (#4d4635) at **15% opacity**. It should be felt, not seen.
*   **Glowing Borders:** For active states or "Featured" cards, use a `1px` border with a linear gradient of `primary` to `transparent`, creating a "shimmer" effect on the edge.

---

## 5. Components & UI Primitives

### Buttons (The Sigils)
*   **Primary:** Gradient of `primary` to `primary_container`. `16px` (1rem) rounded corners. Text color: `on_primary`.
*   **Secondary (Electric):** `secondary_container` background with `on_secondary_container` text. This is for high-action "Unlock" or "Subscribe" moments.
*   **Tertiary (Ghost):** No background. `primary` text. Use for "Cancel" or "Back."

### Cards (The Parchments)
*   **Construction:** Use `surface_container_low` with a `1.5rem` (24px) border radius. 
*   **Interaction:** On hover, transition the background to `surface_container_high` and increase the ambient shadow spread. **Never use dividers.** Use vertical white space (`2rem+`) to separate card content.

### Input Fields
*   **State:** Background should be `surface_container_lowest`. 
*   **Focus:** The border should glow subtly using `primary` at 30% opacity. 
*   **Typography:** User input should always be in `body-lg` Manrope for maximum clarity.

### Additional Thematic Components
*   **The "Lume" Indicator:** A small, 4px circular dot using `tertiary` (Aurora Green) with a `12px` outer glow to indicate "Online" or "Live" sessions.
*   **Glass Modals:** Background: `surface_container` at 70% opacity + `blur(20px)`. Edge: `outline_variant` at 10% opacity.

---

## 6. Do’s and Don'ts

### Do:
*   **Embrace Asymmetry:** Place a `display-lg` headline off-center to create a sense of movement.
*   **Use Large Whitespace:** Let elements breathe. Content should feel like it is floating in a vast night sky.
*   **Layer Glass:** Use semi-transparent layers to show hints of underlying content, creating curiosity.

### Don’t:
*   **Don't use 100% Opaque Borders:** This shatters the "Neo-Mysticism" illusion and makes the UI feel like a standard bootstrap template.
*   **Don't use Pure Grey:** Always tint your neutrals with the deep navy/obsidian tones of the `surface` palette.
*   **Don't Overuse the Serif:** Keep Noto Serif SC for headings only. Using it for body text or labels will degrade the "Tech-Forward" feel and impact readability.
*   **Don't use Sharp Corners:** Nothing in this system is sharper than `0.5rem` (sm), and most elements should live at `1rem` (DEFAULT) or `2rem` (lg).
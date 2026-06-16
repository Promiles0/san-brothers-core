# San Brothers UI/UX Design System Enhancements

This document outlines the proposed design system enhancements for the San Brothers login and signup pages, focusing on modern UI/UX principles as requested. It builds upon the existing Tailwind CSS configuration and custom properties defined in `src/styles.css`.

## 1. Color Palette

The existing color palette uses `oklch` for defining colors, providing a robust foundation for accessibility and consistency. We will leverage these existing definitions and introduce new shades or accent colors as needed for the enhanced UI elements.

**Existing Primary Colors (from `src/styles.css`):**

| CSS Variable             | Light Mode Value      | Dark Mode Value       | Description                                |
| :----------------------- | :-------------------- | :-------------------- | :----------------------------------------- |
| `--primary`              | `oklch(0.31 0.08 263)`  | `oklch(0.6 0.13 263)`   | Deep navy, main brand color                |
| `--primary-foreground`   | `oklch(0.98 0.005 250)` | `oklch(0.98 0.005 250)` | Text color on primary background           |
| `--accent`               | `oklch(0.58 0.14 25)`   | `oklch(0.65 0.16 25)`   | Warm red, for emphasis                     |
| `--accent-foreground`    | `oklch(0.98 0.005 250)` | `oklch(0.98 0.005 250)` | Text color on accent background            |
| `--destructive`          | `oklch(0.58 0.22 27)`   | `oklch(0.65 0.2 27)`    | Red, for error messages and warnings       |
| `--destructive-foreground` | `oklch(0.98 0.005 250)` | `oklch(0.98 0.005 250)` | Text color on destructive background       |
| `--background`           | `oklch(1 0 0)`          | `oklch(0.16 0.03 260)`  | Page background                            |
| `--foreground`           | `oklch(0.18 0.04 260)`  | `oklch(0.98 0.005 250)` | Main text color                            |
| `--border`               | `oklch(0.92 0.01 255)`  | `oklch(1 0 0 / 12%)`    | Border color for elements                  |
| `--input`                | `oklch(0.92 0.01 255)`  | `oklch(1 0 0 / 15%)`    | Input field background/border              |

**Proposed Color Enhancements:**

To achieve the requested gradient background and subtle glow effects, we will introduce new utility classes and potentially modify existing color usage. The gradient background will likely utilize a combination of existing `--primary` and `--background` colors, or new, slightly desaturated variants to ensure readability.

## 2. Typography

The project currently uses `Inter` for sans-serif fonts and `JetBrains Mono` for monospace. This provides a clean and modern typographic base.

**Existing Typography (from `src/styles.css`):**

| CSS Variable | Font Family                                |
| :----------- | :----------------------------------------- |
| `--font-sans`  | `Inter, system-ui, -apple-system, sans-serif` |
| `--font-mono`  | `"JetBrains Mono", ui-monospace, monospace` |

**Proposed Typography Enhancements:**

No significant changes to font families are proposed. Emphasis will be placed on consistent application of font sizes, weights, and line heights for improved readability and visual hierarchy, especially within the card-style containers and form elements.

## 3. Spacing and Layout

The existing layout uses `rem` units for spacing, which is good for responsiveness. The `AuthLayout` component already provides a centered container.

**Existing Spacing and Layout Principles:**

*   `--radius`: `0.625rem` (10px) for rounded corners.
*   `max-w-110`: A maximum width of `110` units (likely `rem` or `px`) for the main content area in `AuthLayout`.
*   `p-6` and `p-8`: Padding values for elements.
*   `space-y-2`, `space-y-4`: Utility classes for vertical spacing.

**Proposed Spacing and Layout Enhancements:**

*   **Centered Card-Style Container:** The `AuthLayout` already provides a card-like structure. We will enhance this by applying more pronounced `rounded-xl` or similar classes for rounded corners and adding a `shadow-lg` or `shadow-xl` for a subtle shadow effect.
*   **Consistent Padding:** Ensure consistent internal padding within the login/signup forms and around the card container.
*   **Responsive Adjustments:** Further refine spacing and element sizing for optimal display on various screen sizes, ensuring large tap targets on mobile.

## 4. Visual Elements and Interactions

**Proposed Visual Enhancements:**

*   **Background:** Implement a `linear-gradient` background for the `body` or a parent container, transitioning between complementary colors. This can be achieved by modifying the `bg-linear-to-br` class in `AuthLayout` or introducing a new custom utility.
*   **Brand Logo:** The logo is already present (`/sanlogo-Photoroom.png`). We will ensure it is prominently displayed at the top of the card.
*   **Input Field Animations:** On focus, input fields will exhibit a subtle glow or border highlight. This can be achieved using Tailwind's `focus:ring` or `focus:border` utilities, potentially with custom colors or animations defined in `styles.css`.
*   **Error Messages:** Leverage the existing `--destructive` color for clear, visually distinct error messages.

**Proposed Interaction Enhancements:**

*   **Form Transitions:** Implement smooth fade/slide transitions between login and signup forms. This will likely involve state management in React and CSS transition properties or animation libraries.
*   **Password Strength Meter:** The `PasswordStrength` component already exists in `auth-layout.tsx`. We will integrate this more prominently into the signup form and ensure its visual feedback is clear.
*   **Show/Hide Password Toggle:** Add an icon (e.g., eye icon) within the password input field that toggles password visibility.
*   **Toggle Switch for "Remember me":** Replace the standard checkbox with a visually appealing toggle switch component.
*   **Social Login Buttons:** Style existing social login buttons (Google, WeChat) as 
pill-style buttons, and consider adding Microsoft.

## 5. Microcopy

Microcopy will be updated to be friendly and concise, as requested.

*   **Buttons:** "Sign in securely", "Create account", "Next", "Back", "Confirm".
*   **Placeholders:** "Enter your email", "Your password", "Full Name", "Phone Number".
*   **Security Text:** "Secure Login" with a lock icon.

## 6. API Integration Hooks

The existing `login.tsx` and `signup.tsx` files already demonstrate API integration with Supabase. We will ensure that the enhanced UI components maintain these integration points and provide clear hooks for any new authentication flows (e.g., 2FA setup).

## 7. Mobile Responsiveness

The current use of Tailwind CSS and `rem` units provides a good foundation for responsiveness. We will specifically address:

*   **Large Tap Targets:** Ensure buttons and interactive elements have sufficient size for touch interaction.
*   **Adaptive Scaling:** Verify that the layout and components scale gracefully across various mobile screen sizes.
*   **Pill-Style Social Login Buttons:** As mentioned above, social login buttons will be styled for better mobile usability.

This design system document will guide the implementation of the UI/UX enhancements, ensuring consistency and adherence to modern design principles.

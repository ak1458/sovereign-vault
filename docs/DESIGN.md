# Design System & Aesthetic Architecture (DESIGN.md)

## Project: SovereignVault
**Style Directive:** Modern Native Glassmorphism + Weightless Spatial Dark Aesthetics  

---

## 1. Design Tokens & Color Palette

The visual language of SovereignVault is designed to evoke absolute security, privacy, and weightless fluid interaction.

```css
:root {
  /* Dark Theme Palette (Default) */
  --vault-bg: #090a0f;
  --vault-surface: rgba(18, 20, 29, 0.75);
  --vault-card-bg: rgba(26, 30, 44, 0.65);
  --vault-border: rgba(255, 255, 255, 0.08);
  --vault-text: #f1f5f9;
  --vault-subtext: #94a3b8;
  --vault-accent: #6366f1; /* Sovereign Indigo */
  --vault-accent-glow: rgba(99, 102, 241, 0.35);
  --vault-success: #10b981;
  --vault-error: #ef4444;

  /* Glassmorphism Blur */
  --vault-glass-blur: blur(16px);
  --vault-radius: 16px;
  --vault-radius-sm: 10px;
}

[data-theme='light'] {
  --vault-bg: #f8fafc;
  --vault-surface: rgba(255, 255, 255, 0.85);
  --vault-card-bg: rgba(241, 245, 249, 0.8);
  --vault-border: rgba(0, 0, 0, 0.08);
  --vault-text: #0f172a;
  --vault-subtext: #64748B;
  --vault-accent: #4f46e5;
  --vault-accent-glow: rgba(79, 70, 229, 0.2);
}
```

---

## 2. Typography & Iconography

- **Primary Font**: Inter / system-ui (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto`).
- **Icon Set**: Google Material Symbols Outlined (`filled` variation applied on active tab navigation).
- **Heading Hierarchy**:
  - `h1`: 20px / 1.25 line-height / SemiBold (600)
  - `h2`: 16px / 1.3 line-height / Medium (500)
  - `body`: 14px / 1.5 line-height / Normal (400)
  - `caption/subtext`: 12px / 1.4 line-height / Normal (400)

---

## 3. Native Layout Guidelines

1. **Native Shell Boundary**:
   - Web application wraps in a native smartphone container framing (`native-shell` & `native-phone`) for desktop views, seamlessly expanding to 100% viewport on mobile touch devices.
2. **Touch Targets**:
   - All interactive touch targets (buttons, list items, pin keys, navigation tabs) maintain a minimum target size of `44px x 44px`.
3. **Micro-Animations**:
   - Scale feedback on tap (`active:scale-95`).
   - Smooth backdrop filter transition on modal drawers and bottom navigation (`transition: all 0.2s ease`).

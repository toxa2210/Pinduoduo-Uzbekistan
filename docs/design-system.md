# Pinduoduo Uzbekistan — Mobile Design System

Figma source of truth: https://www.figma.com/design/6DgnojlNTWhb0s7Bk9sBeC

## Product direction

Android-first cross-border marketplace for Uzbekistan. The UI is optimized for fast discovery, price clarity, local delivery and UZS payments.

## Visual tokens

- Brand: #E02B2B
- Brand soft: #FFF1F1
- Ink: #17181A
- Muted: #6F7378
- Background: #F7F7F8
- Surface: #FFFFFF
- Line: #E9EAEC
- Success: #19A463
- Warning: #FFB020
- Info: #3478F6

## Typography

Inter is the primary UI font.

- Display: 32 / Bold
- Screen title: 24 / Bold
- Section title: 19–20 / Bold
- Body: 14–16 / Regular
- Label: 12 / Medium
- Button: 15 / Semi Bold

## Layout

- Reference mobile frame: 390 × 844
- Base spacing: 4 px
- Common spacing: 8 / 12 / 16 / 20 / 24
- Card radius: 14–18 px
- Button/input radius: 12 px
- Pill radius: 999 px

## Core components

Search field, primary/secondary buttons, pills, product cards, category tiles, address card, payment card, order card, bottom navigation, delivery timeline.

## Core screens

Home, Search, Categories, Product Detail, Cart, Checkout, Orders, Profile, Auth/OTP, Delivery Tracking.

## Localization

Primary UI copy is designed for Uzbek and Russian localization. Currency is UZS. Phone authentication uses +998. Payment UI is prepared for local cards such as UZCARD/HUMO and future payment integrations.

## Implementation rule

Figma is the visual source of truth. Production code should map tokens into TypeScript theme constants rather than hard-code visual values across screens.

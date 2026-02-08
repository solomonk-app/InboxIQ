# InboxIQ — Frontend

React Native (Expo SDK 52) mobile app for the InboxIQ Gmail Summarizer.

## Architecture

```
src/
├── components/      # Reusable UI (CategoryCard, EmailRow, LoadingModal)
├── config/          # RevenueCat configuration
├── constants/       # Theme colors, categories, frequencies
├── hooks/           # Zustand stores (auth, theme, subscription), useColors
├── navigation/      # Stack + Tab navigators
├── screens/         # App screens
├── services/        # API client (Axios)
├── types/           # Shared TypeScript interfaces
└── utils/           # Date/time formatting helpers

assets/              # App icons, splash screen, notification icon
App.tsx              # Root component with animated splash
app.json             # Expo config
```

## Prerequisites

- Node.js >= 18
- Expo Go app on your device (for development)
- Running InboxIQ backend (see `../inboxiq-backend/`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Set your backend API URL and Google Client ID

# 3. Start Expo dev server
npx expo start
```

## Screens

| Screen     | Description                                                        |
|------------|--------------------------------------------------------------------|
| Login      | Google OAuth sign-in with animated logo and feature highlights     |
| Dashboard  | Category cards, stats banner (Total/Unread/Action), quick actions  |
| Category   | Email list filtered by category or filter (unread, action required)|
| Digest     | AI-generated summary with highlights, action items, top emails     |
| Settings   | Theme mode, subscription status, digest scheduling, account info   |
| Paywall    | Pro upgrade screen with pricing, purchase, and restore             |

## Key Features

### Subscription System (Free / Pro)
- **Free tier**: 3 digests per day, view-only
- **Pro tier**: Unlimited digests, email sending, auto-scheduling
- RevenueCat integration for in-app purchases (iOS + Android)
- Paywall screen shown when gated features are tapped
- Graceful fallback in Expo Go (RevenueCat native module unavailable)

### Theme Support
- Light, Dark, and System (auto-detect) modes
- Dynamic color palette via `useColors()` hook
- Persisted to device storage

### Navigation
- **AuthStack**: Login screen
- **AppStack**: Bottom tab navigator (Inbox / Digest / Settings) + Category detail (push) + Paywall (modal)
- Clickable stats on Dashboard navigate to filtered email lists

### Animated Splash Screen
- Custom animated splash with logo glow, shimmer, and orbiting dots
- Replaces native splash seamlessly via `expo-splash-screen`

## Tech Stack

| Library                    | Purpose                    |
|----------------------------|----------------------------|
| Expo SDK 52                | App framework              |
| React Navigation           | Stack + Tab navigation     |
| Zustand                    | State management           |
| Axios                      | HTTP client                |
| react-native-reanimated    | Animations                 |
| react-native-purchases     | RevenueCat IAP             |
| expo-web-browser           | Google OAuth flow          |
| expo-secure-store          | Secure token storage       |
| expo-splash-screen         | Splash screen control      |

## Android Emulator Setup

The Android emulator needs port forwarding to reach the backend on localhost:

```bash
# Required after every emulator restart
adb reverse tcp:3000 tcp:3000
```

The API client automatically uses `10.0.2.2` (Android's alias for host localhost) when running on Android.

## Building for Production

```bash
# Using EAS Build (recommended)
npx eas build --platform all

# iOS only
npx eas build --platform ios

# Android only
npx eas build --platform android
```

Note: RevenueCat in-app purchases only work in production/TestFlight builds, not in Expo Go.

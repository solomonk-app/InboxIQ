# 📬 InboxIQ — Frontend

React Native (Expo) mobile app for the InboxIQ Gmail Summarizer.

## Architecture

```
src/
├── components/      # Reusable UI components
├── constants/       # Colors, categories, config
├── hooks/           # Zustand stores, custom hooks
├── navigation/      # Stack + Tab navigators
├── screens/         # App screens
├── services/        # API client (Axios)
├── types/           # Shared TypeScript interfaces
└── utils/           # Formatting helpers

assets/              # App icons, splash screen
App.tsx              # Root component
app.json             # Expo config
```

## Prerequisites

- Node.js >= 18
- Expo CLI: `npm install -g expo-cli`
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

| Screen      | Description                                      |
|-------------|--------------------------------------------------|
| Login       | Google OAuth sign-in with feature highlights      |
| Dashboard   | Category cards, stats banner, quick actions       |
| Category    | Email list filtered by AI category                |
| Digest      | AI-generated summary with highlights + actions    |
| Settings    | Schedule frequency, delivery time, account        |

## Building for Production

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android

# Or using EAS Build (recommended)
npx eas build --platform all
```

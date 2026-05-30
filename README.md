# myTrack

> All-in-one personal tracking dashboard — habits, mood, health, finance, study, and more. 100% offline, encrypted on-device.

This is an app I personally vibe coded for personal use. Built with Capacitor, vanilla JS, and a lot of caffeine. No frameworks, no backend, no data leaves your device.

[![Build](https://github.com/AmelCMM/myTrack/actions/workflows/build.yml/badge.svg)](https://github.com/AmelCMM/myTrack/actions/workflows/build.yml)

## Features

- **Habits** — daily habit tracking with streaks
- **Mood** — emoji mood logging with trends
- **Journal** — encrypted private entries
- **Health** — sleep, steps, exercise, vitals, symptoms, medications, nutrition
- **Finance** — accounts, transactions, budgets, spending breakdown
- **Study** — courses, assignments, focus timer (Pomodoro)
- **Projects** — project & task management
- **Timeline** — chronological feed of all activity
- **Insights** — balance score, heatmaps, trends
- **Goals & Challenges** — track what matters, push your limits
- **Achievements** — gamified progress with XP & levels
- **Themes** — 12 theme variants, 8 accent colors, custom fonts & radius
- **i18n** — English, French, Spanish, German
- **Encryption** — AES-256-GCM + PBKDF2-SHA512 when PIN is set
- **Offline** — full PWA with service worker, works without internet
- **BLE** — Bluetooth heart rate monitor support (with sim fallback)

## Prerequisites

- Node.js 18+
- Java JDK 17+
- Android SDK (set `ANDROID_HOME`)
- Android Studio (recommended for easy setup)

## Setup

```bash
# Clone
git clone https://github.com/AmelCMM/myTrack-app.git
cd myTrack-app

# Install dependencies
npm install

# Add Android platform
npx cap add android

# Sync web assets
npx cap copy android
```

## Build APK

```bash
# Sync latest changes
npx cap copy android

# Build debug APK
cd android && ./gradlew assembleDebug

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

Or open in Android Studio for a one-click build:

```bash
npx cap open android
```

## Release Signing

For release builds, set these repository secrets in GitHub:

| Secret | Value |
|--------|-------|
| `ANDROID_KEYSTORE_PATH` | Path to your `.jks` keystore in the repo |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

The debug APK is built automatically on every push. Release APKs are built on pushes to `main` when secrets are configured.

## Development

```bash
# Serve locally for browser testing
python3 -m http.server 8080 -d www
# then open http://localhost:8080
```

The app is fully functional in a browser — no device needed for most features.

## Project Structure

```
www/
├── index.html              # App shell
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── offline.html            # Offline fallback
├── css/
│   └── main.css            # All styles (3009 lines)
└── js/
    ├── app.js              # Main controller (1371 lines)
    ├── state.js            # State management & CRUD
    ├── storage.js          # AES-GCM encrypted storage
    ├── bridge.js           # Native plugin abstraction
    ├── helpers.js          # 200+ utility functions
    ├── constants.js        # App constants & defaults
    ├── i18n.js             # Multi-language support
    ├── themes.js           # Theme engine (12 variants)
    ├── navigation.js       # Screen navigation
    ├── components.js       # Reusable UI components
    ├── sheets.js           # 27 form sheet generators
    ├── screens/            # Screen renderers
    └── features/           # Feature modules
```

## Tech Stack

- **Runtime**: Capacitor 8 + vanilla ES modules
- **Storage**: localStorage + AES-256-GCM (Web Crypto API)
- **UI**: CSS custom properties, no frameworks
- **PWA**: Service worker with network-first caching
- **Fonts**: DM Sans + DM Mono via Google Fonts

## Credits

Built by **Neura Lumina** ([@AmelCMM](https://github.com/AmelCMM)) — vibe coded for personal use.

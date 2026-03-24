# Pacewell

> AI-powered recovery and vitality tracking for active adults 50+

---

## Overview

Pacewell is a cross-platform mobile application built with React Native and Expo, designed specifically for active adults aged 50 and above. The app bridges a clear gap in the wellness market — existing solutions either target young high-performance athletes or focus narrowly on fall detection and medication reminders for the elderly. Pacewell serves the underserved middle ground: people who are still running, cycling, swimming, and playing sport, but whose bodies recover differently than they did at 30.

Rather than simply logging numbers, Pacewell uses AI to surface patterns users would never spot themselves — like why they always feel drained on Thursdays, or why a recurring injury keeps returning. It delivers these insights in plain, conversational language, not clinical charts.

---

## Features

- **Daily Check-in** — Log mood, energy, stress, sleep quality, and nutrition using an intuitive emoji-based scale
- **Activity Tracking** — Manual entry and wearable integration via Apple HealthKit and Google Health Connect
- **AI Pattern Recognition** — Powered by the Anthropic API to detect trends, correlations, anomalies, and predictive signals across your health data
- **Recovery Insights** — Plain language explanations of what your data means, not just what it shows
- **Privacy First** — Full row-level security via Supabase ensures your health data is only ever accessible to you

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 55) |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| AI Layer | Anthropic API (Claude) |
| State Management | Zustand |
| Local Storage | AsyncStorage |
| Cloud Builds | Expo Application Services (EAS) |
| Wearables | react-native-health (HealthKit + Health Connect) |

---

## Project Structure

```
pacewell/
├── app/                        # All screens (Expo Router)
│   ├── (auth)/                 # Auth screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                 # Main app tab screens
│   │   ├── _layout.tsx
│   │   └── dashboard.tsx
│   └── _layout.tsx             # Root layout (auth state)
├── components/                 # Reusable UI components
│   ├── ui/                     # Generic elements (buttons, cards)
│   └── health/                 # Health-specific components
├── lib/                        # Utilities and clients
│   ├── supabase.ts             # Supabase client
│   └── anthropic.ts            # Anthropic API helper
├── store/                      # Zustand global state
│   └── useHealthStore.ts
├── hooks/                      # Custom React hooks
│   └── useHealthData.ts
└── types/                      # TypeScript type definitions
    └── health.ts
```

---

## Database Schema

Pacewell uses five tables in Supabase, all protected with Row Level Security:

| Table | Description |
|---|---|
| `profiles` | User profile, activity level, and health goals |
| `daily_checkins` | Daily mood, energy, stress, and sleep logs |
| `activity_logs` | Physical activity entries (manual + wearable) |
| `nutrition_logs` | Hydration and nutrition quality logs |
| `ai_insights` | Stored AI-generated insights and patterns |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Expo CLI
- EAS CLI (`npm install -g eas-cli`)
- A Supabase account and project
- An Anthropic API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pacewell.git
cd pacewell

# Install dependencies
npm install --legacy-peer-deps

# Install Expo-managed packages
npx expo install @supabase/supabase-js zustand @react-native-async-storage/async-storage
```

### Environment Variables

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key
```

> **Note:** Never commit your `.env` file to version control. It is included in `.gitignore` by default.

### Database Setup

Run the schema script located in `/supabase/schema.sql` in your Supabase SQL Editor to create all tables and RLS policies.

### Running Locally

```bash
# Start the development server
npx expo start

# Run on Android (requires Android Studio or physical device)
npx expo start --android

# Run on iOS (requires Mac + Xcode, or EAS Build)
npx expo start --ios
```

### Building with EAS

```bash
# Configure EAS for your project (first time only)
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Build for both platforms
eas build --platform all
```

---

## Authentication

Pacewell supports two authentication methods via Supabase Auth:

- **Email & Password** — Standard credential-based login
- **Magic Link** — Passwordless email authentication that deep links back into the app via the `pacewell://` URL scheme

---

## AI Insights

Health data is periodically sent to the Anthropic API for pattern analysis. Claude analyses the user's longitudinal data across four insight types:

| Type | Example |
|---|---|
| **Trend** | Your average energy has declined steadily over the past 3 weeks |
| **Correlation** | Your mood scores are consistently lower after nights with under 6 hours sleep |
| **Anomaly** | Your fatigue levels have been unusually high for 11 consecutive days |
| **Prediction** | Based on your current recovery patterns, injury risk may be elevated this week |

---

## Privacy & Security

- All database tables use Supabase Row Level Security (RLS)
- Users can only read and write their own data
- Deleting an account cascades and removes all associated health data
- Environment variables are never committed to version control
- The Anthropic API key is stored server-side and never exposed to the client

---

## Roadmap

- [ ] Wearable integration (Apple HealthKit + Google Health Connect)
- [ ] Weekly AI insight reports
- [ ] Push notifications for recovery nudges
- [ ] Injury risk scoring
- [ ] Export data as PDF report for GP appointments
- [ ] Apple Watch / Wear OS companion app

---

## Contributing

This project is currently in active development. Contribution guidelines will be published when the MVP is complete.

---

## Licence

MIT Licence — see `LICENSE` for details.

---

*Built with ❤️ for the generation that refuses to slow down.*
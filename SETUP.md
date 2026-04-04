# InventoryEver — Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd inventory-anything
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_VISION_API_KEY=your-google-api-key
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key
```

### 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon key** to `.env.local`
3. Open the **SQL Editor** and run these files IN ORDER:
   - `database/migrations/001_initial_schema.sql`
   - `database/migrations/002_rls_policies.sql`
   - `database/migrations/003_storage_and_realtime.sql`
4. Go to **Storage** → Create bucket named `item-images`, set to **Public**
5. Go to **Authentication** → Enable **Email provider**

### 4. Run the App

```bash
npm run start
```

Scan the QR code with **Expo Go** on your phone, or press:
- `i` for iOS Simulator
- `a` for Android Emulator
- `w` for Web browser

---

## API Keys Guide

### Required for Core Functionality

| Key | Where to Get | Cost |
|-----|--------------|------|
| Supabase URL + Key | [supabase.com](https://supabase.com) | Free |

### Required for AI Features

| Key | Where to Get | Cost |
|-----|--------------|------|
| Google Vision API | [console.cloud.google.com](https://console.cloud.google.com) → Enable Vision API | Free tier: 1K/mo |
| OpenAI API Key | [platform.openai.com](https://platform.openai.com) | ~$0.01/request |

### Required for Receipt Scanning

| Key | Where to Get | Cost |
|-----|--------------|------|
| Veryfi Client ID + Secret | [veryfi.com](https://veryfi.com) | Free tier: 100/mo |

### Required for Subscriptions

| Key | Where to Get | Cost |
|-----|--------------|------|
| RevenueCat iOS Key | [app.revenuecat.com](https://app.revenuecat.com) | Free until $2.5K MRR |
| RevenueCat Android Key | Same | Free |

---

## Project Structure

```
inventory-anything/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Sign in / Sign up
│   ├── (tabs)/             # Main app tabs
│   │   ├── index.tsx       # Home dashboard
│   │   ├── inventory.tsx   # Item list with search/filter
│   │   ├── add-item.tsx    # Add item (AI + manual)
│   │   ├── alerts.tsx      # Alerts & notifications
│   │   └── profile.tsx     # Settings & subscription
│   ├── item/[id].tsx       # Item detail + edit
│   └── _layout.tsx         # Root layout with auth
├── components/
│   ├── ui/                 # Button, Card, Input, Modal, etc.
│   └── inventory/          # ItemCard, SearchBar, AddItemForm
├── contexts/               # Auth, Workspace, Subscription
├── hooks/                  # useAuth, useItems, useWorkspace, etc.
├── lib/                    # supabase.ts, ai.ts, storage.ts, utils.ts
├── types/                  # TypeScript type definitions
├── constants/              # colors.ts, config.ts
└── database/
    └── migrations/         # SQL files to run in Supabase
```

---

## Features

- **AI Item Recognition** — Take a photo, AI fills in the details
- **Receipt OCR** — Scan receipts to auto-fill purchase data
- **Real-time Sync** — Changes appear instantly across devices
- **Multiple Workspaces** — Separate Home, Office, Storage spaces
- **Warranty Tracking** — Get alerts before warranties expire
- **Maintenance Logs** — Track service history for items
- **Advanced Search** — Filter by category, location, condition, price
- **Subscription Tiers** — Free (50 items) / Pro / Business

---

## Deployment

### iOS & Android

```bash
npm install -g eas-cli
eas login
npm run build:ios
npm run build:android
```

### Web

```bash
npm run deploy:web
```

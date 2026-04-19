# Expense Manager

Personal expense tracking PWA built with React 19 + TypeScript + Firebase.

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill Firebase credentials
npm run dev                   # http://localhost:5173
```

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | TypeScript check + Vite production build to `/dist` |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Build + deploy to GitHub Pages via `gh-pages` |

## Tech Stack

- **Frontend:** React 19 + TypeScript 5.9 + Vite 7
- **Styling:** Tailwind CSS 4.1 (PostCSS plugin, no config theme extensions)
- **Database:** Firebase Realtime Database (optional; works offline with localStorage)
- **Auth:** Firebase Google OAuth 2.0
- **Charts:** Recharts 3.6
- **Icons:** Lucide React
- **PWA:** Service Worker + Web App Manifest (installable, offline-capable)

## Architecture

```
App.tsx (orchestrator, all state lives here)
├── Views: AuthView | AddExpenseView | ListView | StatsView | SettingsView
├── Hooks: useExpenses, useSettings, useGmailSync, useExchangeRate, useOnlineStatus
├── Services: firebase/, gmail/, exchangeRate/, csv/, localStorage/
└── Components: common/, charts/, gmail/, layout/
```

### Key Design Decisions

- **No router library.** Navigation is a `ViewType` state (`'list' | 'add' | 'stats' | 'settings' | 'auth'`) switched in App.tsx.
- **No global state library.** All state managed via custom hooks composed in App.tsx and passed as props.
- **Dual-mode storage.** Firebase cloud sync when authenticated; localStorage fallback when not. The `syncStatus` field on `Expense` tracks `'synced' | 'pending'`.
- **Offline-first.** Pending expenses queue locally and sync when back online.
- **Multi-currency.** Every expense stores `amount` (native), `amountINR`, and `amountUSD`. Exchange rates fetched from ExchangeRate-API with 1h (creation) / 24h (stats) caching.

## Project Structure

```
src/
├── App.tsx                     # Main component, all orchestration
├── main.tsx                    # Entry point, service worker registration
├── types/
│   ├── index.ts                # Expense, FormState, UserPreferences, ViewType, FilterMode
│   └── gmail.ts                # Gmail-specific types
├── constants/
│   ├── tags.ts                 # 9 categories: Shopping, Food, Travel, Hospital, Wife, Baby, Me, Bills, Other
│   ├── currencies.ts           # 15 supported currencies
│   ├── storage.ts              # localStorage keys
│   ├── firebase.ts             # Firebase path constants
│   ├── csv.ts                  # CSV column definitions
│   └── donation.ts             # Donation feature config
├── hooks/
│   ├── useExpenses.ts          # Core: expense list, filtering, form state, CRUD dispatch
│   ├── useSettings.ts          # User prefs (currency, export URL, Gmail config)
│   ├── useGmailSync.ts         # Gmail OAuth + transaction parsing
│   ├── useExchangeRate.ts      # Rate fetching + caching
│   ├── useOnlineStatus.ts      # Navigator.onLine listener
│   └── usePWAInstall.ts        # beforeinstallprompt handler
├── services/
│   ├── firebase/
│   │   ├── auth.ts             # signInWithGoogle, handleSignOut, setupAuthStateListener
│   │   ├── database.ts         # CRUD: add/update/delete/subscribe/sync expenses
│   │   └── initialization.ts   # Firebase app init guard
│   ├── gmail/
│   │   ├── gmailService.ts     # Gmail API fetch + parse pipeline
│   │   ├── emailParser.ts      # Extract amounts from email HTML/text
│   │   ├── transactionPatterns.ts  # Regex patterns for bank emails
│   │   └── tagMapper.ts        # Map parsed transactions to expense tags
│   ├── exchangeRate/index.ts   # Dual-URL fetch with fallback
│   ├── csv/index.ts            # Export/import CSV
│   └── localStorage/
│       ├── index.ts            # Expense persistence
│       └── gmailStorage.ts     # Gmail token/state persistence
├── views/
│   ├── AuthView/index.tsx      # Google Sign-In screen
│   ├── AddExpenseView/index.tsx # Create/edit expense form with autocomplete
│   ├── ListView/index.tsx      # Expense list, search, filters, pagination
│   ├── StatsView/index.tsx     # Monthly totals, yearly aggregation, trend charts
│   └── SettingsView/index.tsx  # Currency, export, Gmail sync, data management
├── components/
│   ├── common/
│   │   ├── ExpenseItem.tsx     # Single expense card (used in ListView)
│   │   ├── LoadingSpinner.tsx
│   │   ├── NetworkStatusBadge.tsx
│   │   ├── DonationModal.tsx / DonationPrompt.tsx / DonationSection.tsx
│   ├── charts/
│   │   └── ExpenseTrendChart.tsx  # Recharts bar/line/area charts
│   ├── gmail/
│   │   ├── GmailSyncSection.tsx
│   │   ├── GmailPermissionDialog.tsx
│   │   └── TransactionReviewModal.tsx
│   └── PWAInstallPrompt.tsx
├── utils/
│   ├── formatting.ts           # Date/number formatting helpers
│   ├── currencyUtils.ts        # Currency symbol/conversion helpers
│   └── modal.ts                # Alert/confirm wrappers
└── config/
    └── firebase.ts             # Firebase config from env vars
```

## Data Model

### Expense (Firebase path: `users/{uid}/expenses/{id}`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Firebase push key |
| `userId` | string | Auth UID |
| `amount` | number | In native currency |
| `currency` | string | 3-letter code (INR, USD, EUR, ...) |
| `amountINR` | number | Converted at creation time |
| `amountUSD` | number | Converted at creation time |
| `description` | string | Free text |
| `tag` | string | One of 9 categories (see `constants/tags.ts`) |
| `timestamp` | Date | JS Date |
| `dateStr` | string | `YYYY-MM-DD` |
| `timeStr` | string | `HH:MM` |
| `syncStatus` | `'synced' \| 'pending'` | Local-only field |

### UserPreferences (Firebase path: `users/{uid}/preferences`)

Currency, exportUrl, statsCurrency, gmailSync settings.

## External Integrations

| Service | Purpose | Config |
|---------|---------|--------|
| Firebase Realtime DB | Cloud storage + real-time sync | `VITE_FIREBASE_*` env vars |
| Firebase Auth | Google OAuth Sign-In | Same Firebase project |
| ExchangeRate-API | Live currency conversion | No key needed (free tier) |
| Gmail API | Parse bank transaction emails | `VITE_GOOGLE_CLIENT_ID`, `VITE_GMAIL_API_KEY` |
| Google Apps Script | Export to Google Sheets | User-deployed script URL in settings |

## Conventions

- **File organization:** Each view is a folder under `views/` with `index.tsx`. Reusable components go in `components/common/`. Feature-specific components get their own subfolder (`components/gmail/`, `components/charts/`).
- **State pattern:** Custom hooks in `hooks/` encapsulate related state + logic. App.tsx composes them and passes results as props. No context providers or global stores.
- **Styling:** Tailwind utility classes inline. Tag colors defined in `constants/tags.ts` as Tailwind class strings. No CSS modules or styled-components.
- **Constants:** All magic strings, keys, and config values live in `constants/`. Never hardcode in components.
- **Services:** Side-effect code (Firebase, API calls, localStorage) isolated in `services/`. Hooks call services; components never call services directly.
- **Types:** All shared interfaces in `types/index.ts`. Gmail-specific types in `types/gmail.ts`.
- **No test framework** is currently set up.

## Common Tasks

### Adding a new expense category (tag)
1. Add the tag name to the `TAGS` array in [constants/tags.ts](src/constants/tags.ts)
2. Add a color entry to `TAG_COLORS` in the same file
3. Update `firebase-rules.json` validation if tag validation is strict

### Adding a new view
1. Create `src/views/NewView/index.tsx`
2. Add the view name to `ViewType` union in [types/index.ts](src/types/index.ts)
3. Add navigation case in App.tsx's view rendering switch
4. Add a nav button in App.tsx's bottom navigation bar

### Adding a new currency
1. Add to the currencies list in [constants/currencies.ts](src/constants/currencies.ts)
2. ExchangeRate-API already supports most ISO 4217 codes

### Modifying Firebase schema
1. Update TypeScript interfaces in `types/index.ts`
2. Update `services/firebase/database.ts` CRUD functions
3. Update `firebase-rules.json` validation rules
4. Handle migration for existing data if needed

## Deployment

- **Target:** GitHub Pages at `/expense-manager/` base path
- **CI/CD:** GitHub Actions (see `.github/`)
- **Manual:** `npm run deploy` pushes built `/dist` to `gh-pages` branch
- **Base path:** Set in `vite.config.ts` as `/expense-manager/`

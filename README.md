# ExpenseManager

ExpenseManager is a small React + TypeScript + Vite single-page app for tracking personal expenses. It works in two modes:

1. **Local-only mode**: No Firebase needed. Add, view, edit, delete expenses, view stats, and export/import CSV — all stored in browser localStorage.
2. **Cloud sync mode**: Optional Firebase integration with Google sign-in for cloud backup and multi-device sync.

**Key features**
- **No sign-in required**: Start using immediately — all expenses saved to localStorage by default.
- **Optional cloud sync**: Sign in with Google to enable Firebase Realtime Database sync. Pending offline changes auto-sync when back online.
- **CSV import / export**: Export all expenses to CSV and import back for backup/restore.
- **Tags & categories**: Predefined tags for fast categorization (Shopping, Food, Travel, Hospital, Wife, Baby, Me, Bills, Other).
- **Simple UI**: Add, list, delete expenses; view pending sync status; monthly/yearly statistics; online/offline status indicator.
- **Offline support**: Full functionality in offline mode with automatic sync when reconnected.

**Two Usage Modes**

| Feature | Local-Only | Cloud Sync |
|---|---|---|
| Add/view/delete expenses | ✅ | ✅ |
| Statistics & reports | ✅ | ✅ |
| CSV export/import | ✅ | ✅ |
| Multi-device access | ❌ | ✅ |
| Cloud backup | ❌ | ✅ |
| Google sign-in | ❌ | ✅ |
| No setup required | ✅ | ❌ (Firebase config needed) |

**Quickstart**

1. Create a `.env.local` file from `.env.example` and fill in your Firebase credentials:

```bash
cp .env.example .env.local
# Edit .env.local with your Firebase values
```

2. Install dependencies

```bash
cd ExpenseManager/expense-manager
npm install
```

3. Start the dev server

```bash
npm run dev
```

4. Build for production

```bash
npm run build
npm run preview
```

Run the app and open the printed local dev URL (usually `http://localhost:5173`).

**Environment Variables**

This app uses Vite's environment variables (prefixed with `VITE_`). Create a `.env.local` file with these variables:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

See `.env.example` for a template. **Do not commit `.env.local`** — it contains sensitive credentials.

**Firebase setup (optional)**

- Create a Firebase project and enable **Realtime Database** (rule set to allow authenticated writes) and **Authentication** with the **Google** provider.
- Copy your Firebase config values from **Project Settings > General** in the Firebase Console.
- Add these values to `.env.local` (for local dev) or configure them in your deployment pipeline (see section below).
- The app stores cloud data under `users/{uid}/expenses` in the Realtime Database.

Security note: Do not commit `.env.local` with production Firebase config. Use environment secrets in your CI/CD pipeline.

**GitHub Actions & gh-pages Deployment**

To deploy to GitHub Pages with Firebase support, create a `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd ExpenseManager/expense-manager && npm install

      - name: Build app
        run: cd ExpenseManager/expense-manager && npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_DATABASE_URL: ${{ secrets.FIREBASE_DATABASE_URL }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ExpenseManager/expense-manager/dist
```

**Setting up GitHub Secrets**

1. Go to your repository on GitHub.
2. Navigate to **Settings > Secrets and variables > Actions**.
3. Click **New repository secret** and add each Firebase variable:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

4. Push to `main` branch — the workflow will build and deploy automatically.

**Deploying with gh-pages CLI locally**

To deploy manually using the `gh-pages` CLI:

```bash
# Install gh-pages globally (or use npx)
npm install -g gh-pages

# Build the app
cd ExpenseManager/expense-manager
npm run build

# Deploy to gh-pages branch
gh-pages -d dist --remote origin

# Or with npx (no global install)
npx gh-pages -d dist --remote origin
```

This pushes the `dist/` folder to the `gh-pages` branch. Configure your repo's GitHub Pages settings to serve from that branch.

**App behavior & data model**
- Expense model fields: `id`, `userId`, `amount`, `currency`, `description`, `tag`, `timestamp`, `dateStr`, `timeStr`, `syncStatus` (`synced`|`pending`).
- Local storage key: `moneytrack_local_expenses`.
- When offline, added expenses are saved locally with `syncStatus: 'pending'`. They are uploaded to Firebase and marked `synced` when online and authenticated.

**CSV format**
- Header: `id,userId,amount,currency,description,tag,timestamp,dateStr,timeStr,syncStatus`
- Use the app `Export` / `Import` buttons to backup and restore data.

**Project structure (high level)**
- `src/App.tsx`: Main application file — UI, Firebase integration, offline sync, import/export, and components.
- `src/`: other components and styles (if present).
- `public/`: static assets.

**Contributing / Running locally**
- Make changes and run `npm run dev` to test locally.
- Optionally create a Firebase test project for syncing.

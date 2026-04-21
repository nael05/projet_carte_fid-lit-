# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fidelyz is a B2B SaaS loyalty card platform. Merchants customize and distribute digital loyalty cards via Apple Wallet and Google Wallet. The platform is multi-tenant — each `entreprise` (merchant company) is an isolated tenant identified by `entreprise_id`.

Three user roles: **master admin** (platform owner), **pro** (merchant staff), and **client** (end customers who receive wallet passes).

## Commands

### Backend (Node.js/Express)
```bash
cd backend
npm run dev      # Development with nodemon (auto-restart)
npm start        # Production
```

### Frontend (React/Vite)
```bash
cd frontend
npm run dev      # Dev server on port 3000
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

### Database
```bash
mysql -u root -p < schema.sql              # Initial schema
mysql -u root -p < SETUP_DATABASE.sql      # Full setup with seed data
```

## Architecture

### Monorepo Structure
- `backend/` — Express API server (port 5000), ES modules
- `frontend/` — React 18 + Vite SPA (port 3000 in dev)
- `schema.sql`, `SETUP_DATABASE.sql` — Database setup scripts

### Backend

**Entry:** `backend/server.js` → routes in `backend/routes/apiRoutes.js` and `backend/routes/walletRoutes.js`

**Route namespaces:**
- `/api/admin/` — master admin (company management, migrations)
- `/api/pro/` — merchant operations (clients, loyalty config, notifications)
- `/api/app/wallet/` — wallet pass creation/update (called by frontend)
- `/api/wallet/v1/` — Apple Wallet Web Service protocol (called by Apple servers for sync)
- `/api/` public — `/join/:entrepriseId`, `/companies/:id/info`, etc.

**Controllers** in `backend/controllers/`:
- `apiController.js` — admin + pro staff operations
- `walletAppController.js` — pass creation and point balance updates
- `appleWebserviceController.js` — Apple's device registration/sync protocol
- `loyaltyController.js` — loyalty config, reward tiers, push notifications

**Key services** in `backend/utils/`:
- `passGenerator.js` — generates `.pkpass` files for Apple Wallet
- `googleWalletGenerator.js` — creates/updates Google Wallet passes via API
- `apnService.js` — sends Apple Push Notifications to trigger pass refresh
- `walletSyncService.js` — orchestrates wallet state sync across devices
- `sessionManager.js` — device fingerprinting and multi-device session tracking
- `emailService.js` — password reset and transactional emails (Brevo API)

**Auth** (`backend/middlewares/auth.js`): JWT (7-day expiry) with role middleware `isAdmin` / `isPro`. Apple Wallet endpoints use a separate `ApplePass <token>` header matched against `wallet_cards.authentication_token`.

**Database** (`backend/db.js`): MySQL 8+ connection pool (10 connections). Key tables: `entreprises`, `clients`, `loyalty_config`, `reward_tiers`, `wallet_cards`, `apple_pass_registrations`, `card_customization`, `sessions`, `transaction_history`.

**Migrations** in `backend/migrations/` — run via admin endpoint `/api/setup/run-migration` or direct SQL.

### Frontend

**Entry:** `frontend/src/main.jsx` → `frontend/src/App.jsx` (React Router)

**Route sections:**
- `/master-admin-secret` — master admin dashboard
- `/pro/` — merchant dashboard and settings
- `/join/:entrepriseId` — public customer registration page

**Auth state:** `frontend/src/context/AuthContext.jsx` — manages JWT token, role, `mustChangePassword` flag, and suspension status via localStorage.

**API client:** `frontend/src/api.js` — Axios instance with request interceptor (injects `Authorization: Bearer` + `X-Device-Id` headers) and response interceptor (redirects on 401 by role).

**Key components:**
- `CardCustomizer.jsx` — full card design studio (colors, logo, GPS locations, push notification text) for both Apple and Google Wallet
- `WalletAddModal.jsx` — guides customers through adding to Apple/Google Wallet
- `PrivateRoute.jsx` / `PrivateAdminRoute` / `PrivateProRoute` — RBAC route guards (redirects to `/pro/secure-password` if `mustChangePassword`)

**Styling:** Custom CSS with design tokens in `src/styles/colors.css` and `src/components/Common.css`. Dark mode applied via class on `document.documentElement`, persisted in localStorage.

## Key Environment Variables

**Backend** (`backend/.env`):
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — MySQL credentials
- `JWT_SECRET` — signing key for auth tokens
- `APPLE_CERT_PATH`, `APPLE_CERT_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_PASS_TYPE_ID` — Apple Wallet certificate
- `APPLE_APN_KEY_PATH`, `APPLE_APN_KEY_ID`, `APPLE_APN_ENVIRONMENT` — APNs push
- `APPLE_WALLET_WEBSERVICE_URL` — public URL Apple calls for pass sync
- `GOOGLE_WALLET_KEY_PATH` — Google service account JSON
- `FRONTEND_URL`, `ALLOWED_ORIGINS` — CORS

**Frontend** (`frontend/.env`):
- `VITE_API_URL` — backend API base URL (defaults to `/api` in production)

## Apple Wallet Sync Flow

Apple Wallet periodically calls the `/api/wallet/v1/` endpoints to check for pass updates. The flow is:
1. Device registers via `POST /wallet/v1/devices/.../registrations/...`
2. When points change, `apnService.js` sends a silent push to registered devices
3. Apple calls `GET /wallet/v1/passes/:passTypeIdentifier/:serialNumber`
4. `passGenerator.js` regenerates and returns the updated `.pkpass` file

This is distinct from the frontend-triggered `POST /app/wallet/add-points` which also calls the sync service internally.

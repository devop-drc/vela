# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InstantShop (formerly InstaShopify) transforms Instagram Business posts into sellable e-commerce products using AI. Users connect their Instagram account via Facebook OAuth, posts are analyzed by Google Gemini to extract product details, and products are managed through an admin dashboard with a public storefront.

## Commands

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Production build → dist/
npm run build:dev    # Development build
npm run lint         # ESLint
npm run preview      # Preview production build
```

No test framework is configured.

## Architecture

**Frontend:** React 18 + TypeScript + Vite, styled with Tailwind CSS + shadcn/ui (Radix UI primitives). Path alias: `@/*` → `src/*`.

**Backend:** Supabase (PostgreSQL + Auth + Edge Functions). Edge Functions are Deno-based, deployed to Supabase, and use Google Gemini for AI analysis.

**Deployment:** Vercel (SPA with `vercel.json` rewrites). Environment vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

### Key Directories

- `src/pages/` — Route-level page components
- `src/components/` — Feature-grouped components + `ui/` (shadcn library)
- `src/contexts/` — Global state: Appearance, Shop, Cart, Sync, Integration
- `src/hooks/` — Custom React hooks (product data, filters, etc.)
- `src/integrations/supabase/client.ts` — Supabase client singleton
- `supabase/functions/` — 23 Deno Edge Functions (AI analysis, Instagram API, orders, sync)
- `supabase/recreate_db.sql` — Full database schema

### Multi-Layout System

The app uses four distinct layouts routed in `App.tsx`:
- **DashboardLayout** — Admin pages (sidebar + header), behind `ProtectedRoute` and `OnboardingGuard`
- **Storefront** (`/shop/*`) — Customer-facing shop
- **Instagram Shop** (`/instagram/*`) — Feed-like product display
- **Auth pages** (`/login`, `/register`) — Public

### Data Flow

- **State:** React Context for global state, TanStack React Query for server state, `useState` for local
- **Data fetching:** Direct Supabase client queries (`supabase.from(...).select(...)`)
- **Real-time:** `supabase.channel()` subscriptions for live updates (activity feed, orders, sync status)
- **Currency:** All monetary values stored in ALL (Albanian Lek). Use `convertCurrency()` from `ShopContext` for display

### Edge Functions (Supabase/Deno)

Core flows:
- **Instagram OAuth:** `instagram-auth` exchanges tokens, creates users, stores integration
- **Post sync:** `background-sync` fetches all posts → compares with DB → AI analyzes new ones → upserts products. Modes: "quick" (skip existing) and "full" (re-analyze all)
- **AI analysis:** `ai-product-classifier` sends captions + user keywords to Google Gemini → extracts product name, price, category, attributes, variants
- **Orders:** `create-order` (validates, converts currency to ALL, reserves inventory), `cancel-order` (restores inventory)

Edge functions require `GEMINI_API_KEY` env var. They use Deno syntax (imports from `esm.sh`, `deno.land`).

## Conventions

- **Never modify `src/components/ui/`** — these are shadcn/ui components. Create wrapper components instead.
- **Routes live in `App.tsx`** — add new routes there.
- **Tailwind CSS only** for styling — no inline styles or separate CSS files.
- **shadcn/ui + Radix UI** for all UI components.
- **Toast notifications:** `showError()`, `showSuccess()` from `@/utils/toast` (Sonner).
- **TypeScript strict mode is off** (`"strict": false` in tsconfig).
- **Icons:** lucide-react.

## Existing Documentation

- `DOCUMENTATION.md` — Detailed architecture, features, page structure, components, DB schema
- `AI_RULES.md` — Tech stack rules and library usage guidelines

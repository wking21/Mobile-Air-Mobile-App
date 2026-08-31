# Ancillary Reconciliation — Executive Dashboard

A Next.js web app for cross-branch reporting on equipment loss and
activity, reading from the same Supabase project the mobile app uses.
Revenue and equipment billing aren't included yet — that data lives in
Texada/Infor and isn't connected here.

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in the **same**
   Supabase project URL/anon key the mobile app (`../`) uses — see that
   project's README for where to find them.
2. `npm install`
3. `npm run dev`, then open http://localhost:3000

## What's on the dashboard

- **Stat cards**: active loss case count and dollar exposure, resolved
  case count and cost written off, completed delivery/pickup counts.
- **Open Cases — Oldest First**: every unresolved loss case, sorted by
  days open, so the longest-outstanding problems surface first.
- **Loss by Branch**: where loss is concentrated.
- **Most Frequently Lost Items**: which items disappear most often.

All numbers are computed server-side on every page load (`src/lib/data.ts`
fetches from Supabase, `src/lib/metrics.ts` does the aggregation) — no
caching, so it's always current when someone opens the page.

## Deploying

This is a standard Next.js app — deploying to
[Vercel](https://vercel.com) is the path of least resistance: connect
this repo, set the project's root directory to `web/`, and add the same
two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel project
settings that are in your local `.env.local`.

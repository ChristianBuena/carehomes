# CareHomesSupportDocs.org — Agent Instructions

## Project Overview

CareHomesSupportDocs.org is a nonprofit membership platform helping licensed California care facility
operators manage, submit, and publish rebuttals to regulatory citations (CCLD) in a compliant,
transparent way.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui
- **Icons:** Lucide React
- **Fonts:** next/font (Google Fonts)
- **Forms:** React Hook Form
- **State:** Zustand (global), useSearchParams for URL state
- **Language:** TypeScript (strict — no `any`)

---

## Design System

### Colors (defined as CSS variables in globals.css)

```css
--color-primary: #1b3a6b; /* Deep Navy — authority, trust */
--color-secondary: #0d8a74; /* Forest Teal — healthcare, calm */
--color-accent: #e8913a; /* Amber — CTAs, highlights */
--color-bg: #f7f8fa; /* Off-white background */
--color-surface: #ffffff; /* Card/surface white */
--color-text: #1a1a2e; /* Near-black text */
--color-muted: #64748b; /* Muted/secondary text */
--color-border: #e2e8f0; /* Borders */
--color-danger: #dc2626;
--color-success: #16a34a;
--color-warning: #d97706;
```

### Fonts

- Display/Headings: distinctive, not Inter or Roboto
- Body: readable, clean
- Always use next/font — never load fonts manually

---

## Next.js Rules (always follow)

1. **App Router only** — never use Pages Router (`pages/` directory)
2. **Server Components by default** — only add `"use client"` when needed (event handlers, hooks, browser APIs)
3. **Metadata** — every page exports `metadata` or `generateMetadata()`
4. **Images** — always `next/image` with `width`, `height`, and `alt`
5. **Links** — always `next/link` for internal navigation
6. **Loading UI** — create `loading.tsx` alongside each page
7. **Error UI** — create `error.tsx` alongside each page (`"use client"`)
8. **Not found** — call `notFound()` from `next/navigation` for missing records
9. **No `any`** — strict TypeScript throughout
10. **Semantic HTML** — correct heading hierarchy (h1→h2→h3), ARIA labels on interactive elements
11. **Mobile-first** — sm → md → lg → xl breakpoint order
12. **URL state for filters** — use `useSearchParams` + `router.replace` so pages are shareable
13. **Route groups** — group public routes under `app/(public)/`
14. **Environment variables** — `NEXT_PUBLIC_` prefix for client-accessible vars only

---

## Folder Structure

```
app/
├── (public)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── facilities/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── providers/page.tsx
│   ├── pricing/page.tsx
│   ├── how-it-works/page.tsx
│   ├── disclaimer/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   ├── takedown-policy/page.tsx
│   └── redaction-policy/page.tsx
├── not-found.tsx
├── global-error.tsx
├── layout.tsx
└── globals.css

components/
├── layout/       ← GlobalHeader, GlobalFooter, NavBar, MobileMenu
├── sections/     ← Homepage sections
├── facilities/   ← Facility-specific components
├── providers/    ← Provider-specific components
├── seo/          ← JsonLd, metadata helpers
└── ui/           ← Shared primitives (Button, Card, Badge, Skeleton, EmptyState...)

lib/
├── metadata.ts
├── site-config.ts
└── mock-data/
    ├── facilities.ts
    └── providers.ts

hooks/            ← useDebounce, useFocusTrap, useProviderFilters
docs/             ← site-architecture.md, mobile-audit.md
```

---

## Key Business Rules

- **Not a government site** — always include disclaimer; never imply CCLD affiliation
- **Not legal advice** — every relevant page must include this disclaimer
- **Resident privacy** — never display or allow any resident-identifying information
- **Provider directory** — neutral listings only; no endorsement, no platform fee
- **Moderation required** — rebuttals only appear on facility pages after approval

---

## Accessibility

- WCAG 2.1 AA compliance
- Color contrast ≥ 4.5:1 for all text
- Keyboard navigation on all interactive elements
- Touch targets minimum 44×44px
- `prefers-reduced-motion` respected on all animations
- ALT text on all images and icons (decorative icons get `aria-hidden="true"`)

---

## Reusable Components (already built or build first)

| Component           | Path                                    | Purpose                              |
| ------------------- | --------------------------------------- | ------------------------------------ |
| Button              | `components/ui/Button.tsx`              | primary / secondary / ghost / danger |
| Badge               | `components/ui/Badge.tsx`               | success / warning / info / neutral   |
| Card                | `components/ui/Card.tsx`                | base card shell                      |
| Skeleton            | `components/ui/Skeleton.tsx`            | shimmer loading states               |
| EmptyState          | `components/ui/EmptyState.tsx`          | zero-result states                   |
| DisclaimerCallout   | `components/ui/DisclaimerCallout.tsx`   | info / warning / legal variants      |
| Breadcrumb          | `components/ui/Breadcrumb.tsx`          | with BreadcrumbList JSON-LD          |
| JsonLd              | `components/seo/JsonLd.tsx`             | structured data injection            |
| ResponsiveContainer | `components/ui/ResponsiveContainer.tsx` | max-w-7xl wrapper                    |

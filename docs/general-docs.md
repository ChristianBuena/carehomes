# Context: CareHomesSupportDocs.org

## System Overview & Core Purpose

CareHomesSupportDocs.org is a SaaS platform and public directory designed for licensed California care facility operators. It provides a standardized way for operators to publicly respond to and rebut regulatory citations issued by the state (CCLD).

The platform serves two main audiences:

1. **The Public / Families:** Can browse a public directory of care facilities and providers to view transparent, compliant citation histories alongside the facility's official rebuttals.
2. **Facility Operators (Subscribers):** Can register, purchase a subscription, claim their facilities, and manage official responses to their state citations.

## Core Workflows & Features

- **Facility Directory & Search:** A public-facing search engine (filtering by location, type, etc.) displaying facility details, citation history, and approved rebuttals.
- **Provider Directory:** A neutral listing of care providers.
- **Facility Claiming System:** Operators can "claim" a facility profile to gain control over it. Claiming is gated by subscription tiers (e.g., Tier A allows claiming 1 facility, Tier C allows up to 10).
- **Rebuttal Management:** Operators draft and submit responses to specific citations. These go through a moderation/approval process before being published to the public facility page.
- **Compliance & Privacy:** The system strictly enforces redaction policies. No resident-identifying information is ever allowed or displayed.

## Architecture & Data Model (Crucial Context)

- **Organization-Based Scoping:** The platform uses a multi-seat, B2B scoping model.
- **Entities:** A `User` belongs to an `Organization`. The `Organization` is the entity that owns the Stripe `Membership` and the claimed `Facilities`.
- **Subscriptions:** Quota limits (how many facilities can be claimed) are enforced at the `organizationId` level, NOT the `userId`.
- **Data Access:** When querying user state or permissions, always reference `user.organization.membership` (never assume a direct user-to-membership relationship).

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19
- **Styling:** Tailwind CSS v4, shadcn/ui, Lucide React
- **Database / Backend:** Prisma ORM (PostgreSQL), NextAuth v4 (with JWT strategy)
- **Payments:** Stripe
- **State Management:** Zustand (global), `useSearchParams` (URL state for shareable filters)
- **Language:** Strict TypeScript (no `any`)

## Development Rules

- **Server Components By Default:** Only use `"use client"` when browser APIs, event handlers, or hooks are necessary.
- **Routing:** Use App Router route groups (e.g., `app/(public)/` for marketing/directory pages, `app/(dashboard)/` for authenticated operator views).
- **Data Loading:** Utilize standard Next.js 15 data fetching and caching with background revalidation.
- **Components:** Built primarily with customized `shadcn/ui` components (found in `components/ui/`).
- **Legal/Disclaimer Constraints:** The site is not a government entity and does not provide legal advice. Relevant pages must always include a disclaimer component.

**Current Goal / Feature to Implement:**
[PASTE YOUR NEW FEATURE REQUEST HERE]

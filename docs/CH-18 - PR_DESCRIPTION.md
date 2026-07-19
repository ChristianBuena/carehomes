# Feature: Organization-Based Multi-Seat Scoping (CH-18)

## Overview
This PR transitions the platform from a per-user facility quota system to a shared, organization-based multi-seat model. By introducing an `Organization` layer, multiple users can now fall under a single subscription, sharing the same facility pool and quota limits seamlessly without causing any data loss for existing users. 

## Key Changes

### 1. Schema Updates (`prisma/schema.prisma`)
- Added the `Organization` model to act as the primary owner of subscriptions and facility quotas.
- Migrated the `Membership` relation from `User` to `Organization`.
- Added an `organizationId` foreign key to `User` and `Facility`.
- Preserved the `Facility.createdById` column to maintain an audit trail for who initially claimed a facility.

### 2. Data Migration (`prisma/migrations/.../migration.sql`)
- Shipped an idempotent raw SQL migration script to safely transition existing user accounts.
- Automatically creates a "personal organization" for every existing user, ensuring zero data loss and maintaining backwards compatibility.
- Re-wires existing Memberships and Facilities to point to the new organizational entities.

### 3. Authentication & JWT Scoping (`src/lib/jwt.ts`, `auth/verify/route.ts`, `mfa/verify/route.ts`)
- Updated the authentication flow so that `orgId` is embedded directly into the JWT (`AuthTokenPayload`) upon login.
- Modified the sign-up flow (`auth/signup/route.ts`) to automatically provision an `Organization` and a scoped `Membership` for all new users.

### 4. Quota Enforcement & API Refactoring
- **Facility Claiming (`actions/claimFacility.ts`, `api/facility/route.ts`)**: Quota limit enforcement (checking against tier limits) is now evaluated against `organizationId` instead of `userId`.
- **Stripe Integration (`stripe/webhook/route.ts`, `stripe/portal/route.ts`, `membership/update/route.ts`)**: Refactored to upsert `Membership` records using the `organizationId` from session metadata, ensuring payments activate the subscription at the organization level.
- **Seat Management (`actions/linkSeatToOrg.ts`)**: Introduced a new server action allowing administrators to manually link users to existing organizations.

### 5. UI Updates (`dashboard/page.tsx`, `facilities/[slug]/page.tsx`, `dashboard/facilities/page.tsx`)
- Refactored server-side queries to fetch membership details via the nested `organization` relation (`dbUser.organization.membership`).
- The UI strictly enforces tier limits (`TIER_A` = 1, `TIER_B` = 3, `TIER_C` = 10), actively disabling/hiding the "Claim Facility" button and displaying clear validation errors when limits are reached.

## Testing & Verification
- Confirmed `canClaimFacility()` accurately restricts claims across multi-seat configurations.
- Updated `prisma/seed.ts` to seamlessly support the new schema during development bootstrapping.
- Ran `npx tsc --noEmit` and `npm run build`; verified zero type errors and clean production builds (Exit Code 0).

## Note to Reviewers
This update significantly changes how `Membership` state is fetched. If reviewing any downstream components, ensure they reference `user.organization.membership` rather than the deprecated `user.membership` structure.

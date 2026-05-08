# NextAuth.js Implementation - MFA + Role-Based Access Control

## Overview
This project implements NextAuth.js with:
- ✅ MFA enforcement for admin users
- ✅ Role-based middleware protecting routes
- ✅ Credential-based authentication with password hashing

## Architecture

### Database Schema
The `User` model includes MFA fields:
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  password     String
  role         UserRole @default(MEMBER)  // MEMBER or ADMIN
  mfaEnabled   Boolean  @default(false)
  mfaSecret    String?                    // TOTP secret
  backupCodes  String[]                   // Recovery codes
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  rebuttalsCreated  Rebuttal[] @relation("RebuttalsCreated")
  rebuttalsReviewed Rebuttal[] @relation("RebuttalsReviewed")
}
```

### Files Created/Modified

#### Authentication Configuration
- **`src/lib/auth.ts`** - NextAuth.js configuration
  - Credentials provider with MFA validation
  - JWT callbacks for role/ID inclusion
  - Session strategy configuration
  
#### Middleware & Protection
- **`src/middleware.ts`** - Route protection middleware
  - Protected routes: `/api/*`, `/dashboard/*`
  - Admin-only routes: `/api/admin/*`
  - MFA enforcement for admin access
  
#### API Routes
- **`src/app/api/auth/[...nextauth]/route.ts`** - NextAuth.js handler
- **`src/app/api/auth/signup/route.ts`** - User registration
- **`src/app/api/auth/mfa/setup/route.ts`** - MFA setup/management
- **`src/app/api/admin/test/route.ts`** - Example admin-only endpoint

#### Frontend Pages
- **`src/app/auth/login/page.tsx`** - Login with optional MFA
- **`src/app/auth/signup/page.tsx`** - User registration

#### Helpers
- **`src/lib/api-helpers.ts`** - `requireAuth()`, `requireAdmin()`, etc.

## Key Features

### 1. MFA Enforcement (Admin Users)
- Admins are required to set up 2FA
- MFA verification happens during login
- Backup codes provided for account recovery

### 2. Role-Based Access Control
```typescript
// Middleware automatically checks:
// - No token → redirect to /auth/login
// - Non-admin accessing /api/admin/* → 403 Forbidden
// - Admin without MFA → 401 Unauthorized

// In API routes:
const user = await requireAdmin(); // Throws if not admin
```

### 3. Login Flow
1. User enters email + password
2. System checks if admin with MFA enabled
3. If yes, prompt for 6-digit code
4. Verify code → create JWT session

## Configuration

### Environment Variables
```env
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000  # or your production URL
DATABASE_URL=postgresql://...
```

### Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

## Usage Examples

### Protected Admin Endpoint
```typescript
import { requireAdmin } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    // Safe: user is admin
    return NextResponse.json({ data: admin });
  } catch (err) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

### Login on Client
```typescript
import { signIn } from 'next-auth/react';

const result = await signIn('credentials', {
  email: 'admin@example.com',
  password: 'password123',
  mfaCode: '123456', // Optional, required if admin has MFA
  redirect: false,
});
```

### Protected Component
```typescript
import { useSession } from 'next-auth/react';

export default function AdminPanel() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (!session?.user) return <div>Unauthorized</div>;
  if ((session.user as any).role !== 'ADMIN') return <div>Admin only</div>;
  
  return <div>Admin content</div>;
}
```

## TODO: Production Enhancements

### 1. TOTP Implementation
Currently using placeholder validation. Implement with:
```bash
npm install speakeasy qrcode
```

Update `src/lib/auth.ts` to use `speakeasy.totp.verify()`.

### 2. Email Verification
- Add email verification during signup
- Resend verification emails

### 3. Password Reset
- Implement forgot password flow
- Time-limited reset tokens

### 4. Session Refresh
- Implement refresh token rotation
- Handle expired sessions gracefully

### 5. Rate Limiting
- Limit failed login attempts
- Rate limit MFA setup endpoint

### 6. Audit Logging
- Log all admin actions
- Track MFA setup/disable events
- Log access to sensitive routes

### 7. Backup Codes
- Properly store encrypted backup codes
- Allow users to regenerate codes
- Log backup code usage

## Testing

### Test Admin Login with MFA
```bash
# 1. Sign up as regular user
POST /api/auth/signup
{ "email": "admin@test.com", "password": "SecurePass123", "name": "Admin User" }

# 2. (In DB) Manually set role to ADMIN and enable MFA
UPDATE users SET role = 'ADMIN', mfa_enabled = true WHERE email = 'admin@test.com';

# 3. Try login without MFA code
POST /api/auth/[...nextauth]?action=callback&provider=credentials
{ "email": "admin@test.com", "password": "SecurePass123" }
# Result: Should prompt for MFA

# 4. Try accessing admin route
GET /api/admin/test
# Without auth: 401 Unauthorized
# With user session: 403 Forbidden
# With admin session: 200 OK
```

## Middleware Security
The middleware (`src/middleware.ts`) protects:
- `/api/*` - Requires authentication
- `/dashboard/*` - Requires authentication
- `/api/admin/*` - Requires ADMIN role + MFA verification

Routes NOT matched by middleware (public):
- `/auth/login`
- `/auth/signup`
- `/api/auth/*` - NextAuth endpoints
- `/` - Home/pricing pages

## Session Details
- Strategy: JWT (not database sessions)
- Max Age: 24 hours
- Token includes: `id`, `email`, `role`

## Notes
- Passwords are hashed with bcryptjs (10 rounds)
- Backup codes are generated but not yet securely stored
- MFA secret storage needs encryption in production
- Consider implementing PWA support for offline access

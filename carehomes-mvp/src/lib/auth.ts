import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './prisma';
import { comparePasswords } from './auth-utils';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code (if needed)', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('User not found');
        }

        const passwordMatch = await comparePasswords(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          throw new Error('Invalid password');
        }

        // MFA enforcement for admins
        if (user.role === 'ADMIN' && user.mfaEnabled) {
          if (!credentials.mfaCode) {
            throw new Error('MFA_REQUIRED');
          }

          // Verify MFA code (using TOTP)
          const mfaValid = verifyMFACode(credentials.mfaCode, user.mfaSecret!);
          if (!mfaValid) {
            throw new Error('Invalid MFA code');
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60,
  },
};

// Simple TOTP verification (install speakeasy or authenticator package for production)
function verifyMFACode(code: string, secret: string): boolean {
  // TODO: Implement proper TOTP verification
  // For now, basic verification - in production use speakeasy or similar
  return code.length === 6 && /^\d+$/.test(code);
}

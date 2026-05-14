import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in .env');
}

/**
 * Generate JWT token
 */
export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}
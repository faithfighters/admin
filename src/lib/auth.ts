import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { User } from './types';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fffa-dev-secret-change-in-production-2026'
);

const COOKIE_NAME = 'fffa_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ===== PASSWORD =====

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// ===== JWT =====

export async function createToken(payload: { userId: string; role: string }): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ userId: string; role: string } | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; role: string };
    } catch {
        return null;
    }
}

// ===== SESSION COOKIE =====

export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
    });
}

export async function getSessionCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

// ===== CURRENT USER (from request) =====

export async function getCurrentUser(): Promise<{ userId: string; role: string } | null> {
    const token = await getSessionCookie();
    if (!token) return null;
    return verifyToken(token);
}

// ===== SANITIZE USER (remove passwordHash) =====

export function sanitizeUser(user: User & { passwordHash?: string }): User {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safe } = user as User & { passwordHash: string };
    return safe;
}

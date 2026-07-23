'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; role?: string; error?: string }>;
    register: (name: string, email: string, password: string, plan: 'faith_builder' | 'faith_hero' | 'faith_fighter') => Promise<{ success: boolean; error?: string }>;
    forgotPasswordInitiate: (email: string) => Promise<{ success: boolean; error?: string }>;
    forgotPasswordVerify: (email: string, code: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    isAdmin: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount, verify session with the API
    useEffect(() => {
        refreshUser().finally(() => setIsLoading(false));
    }, []);

    const refreshUser = async () => {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        }
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; role?: string; error?: string }> => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                return { success: true, role: data.user.role };
            }
            return { success: false, error: data.message || data.error || 'Invalid email or password.' };
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const register = async (
        name: string,
        email: string,
        password: string,
        plan: 'faith_builder' | 'faith_hero' | 'faith_fighter'
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, email, password, plan }),
            });
            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                return { success: true };
            }
            return { success: false, error: data.message || data.error || 'Registration failed.' };
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const forgotPasswordInitiate = async (email: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) {
                return { success: true };
            }
            return { success: false, error: data.message || data.error || 'Failed to send verification code.' };
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const forgotPasswordVerify = async (email: string, code: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await fetch('/api/auth/forgot-password/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, password }),
            });
            const data = await res.json();
            if (res.ok) {
                return { success: true };
            }
            return { success: false, error: data.message || data.error || 'Password reset failed.' };
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                register,
                forgotPasswordInitiate,
                forgotPasswordVerify,
                logout,
                isAdmin: user?.role === 'admin' || user?.role === 'moderator',
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

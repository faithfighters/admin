'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
    const { user, isLoading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/login');
            } else if (!isAdmin) {
                router.push('/login?error=unauthorized');
            }
        }
    }, [user, isLoading, isAdmin, adminOnly, router]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', marginTop: 'var(--header-height)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '1rem', color: 'var(--color-gray-500)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || !isAdmin) return null;

    return <>{children}</>;
}

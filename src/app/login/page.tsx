'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const floatingDonors = [
    { name: 'Jordan S.', amount: '$400' },
    { name: 'Maria T.', amount: '$250' },
    { name: 'David R.', amount: '$180' },
    { name: 'Sarah K.', amount: '$400' },
    { name: 'Alex M.', amount: '$320' },
    { name: 'Lisa P.', amount: '$150' },
    { name: 'James W.', amount: '$500' },
    { name: 'Emma C.', amount: '$275' },
];

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await login(email, password);
        if (result.success) {
            const meRes = await fetch('/api/auth/me', { credentials: 'include' });
            const meData = await meRes.json();
            const role = meData.user?.role;
            if (role === 'admin') {
                router.push('/admin');
            } else if (role === 'moderator') {
                router.push('/moderator');
            } else {
                setError('Access denied. Admin or moderator account required.');
            }
        } else {
            setError(result.error || 'Invalid credentials. Please try again.');
        }
        setLoading(false);
    };

    const handleGoogleSSO = () => {
        window.location.href = `${API_URL}/auth/google?redirect=${encodeURIComponent(window.location.origin + '/admin')}`;
    };

    return (
        <div className={styles.authPage}>
            {/* Grid background */}
            <div className={styles.gridBg} />

            {/* Floating Avatar Ring */}
            <div className={styles.avatarRing}>
                {floatingDonors.map((donor, i) => (
                    <div key={i} className={styles.floatingAvatar}>
                        <div className={styles.avatarImg}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M5 20c0-4 3.5-7 7-7s7 3 7 7" />
                            </svg>
                        </div>
                        <span className={styles.avatarLabel}>{donor.name}</span>
                        <span className={styles.avatarDonation}>
                            Donated <strong>{donor.amount}</strong>🔥
                        </span>
                    </div>
                ))}
            </div>

            <div className={styles.card}>
                {/* Brand icon */}
                <div className={styles.brandIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                    </svg>
                </div>

                <h1 className={styles.title}>Sign in with email</h1>
                <p className={styles.subtitle}>
                    Make a new doc to bring your words, data, and teams together. For free.
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.fieldRow}>
                        <div className={styles.labelRow}>
                            <label htmlFor="email" className={styles.label}>Email</label>
                        </div>
                        <input
                            id="email" type="email" className={styles.input}
                            placeholder="you@example.com"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            required suppressHydrationWarning
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <div className={styles.labelRow}>
                            <label htmlFor="password" className={styles.label}>Password</label>
                            <a href="#" className={styles.forgotLink}>Forgot password?</a>
                        </div>
                        <input
                            id="password" type="password" className={styles.input}
                            placeholder="Enter your password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            required suppressHydrationWarning
                        />
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Signing in…' : 'Get started'}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span className={styles.dividerLine} />
                    <span className={styles.dividerText}>Or sign in with</span>
                    <span className={styles.dividerLine} />
                </div>

                <div className={styles.socialRow}>
                    <button type="button" className={styles.socialBtn} onClick={handleGoogleSSO} aria-label="Google">
                        G
                    </button>
                </div>

                <p className={styles.footer}>
                    New to Faith Fighter of America?{' '}
                    <a href={process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000/register'} className={styles.footerLink}>
                        Create an account
                    </a>
                </p>
            </div>
        </div>
    );
}

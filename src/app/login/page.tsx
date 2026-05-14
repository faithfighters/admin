'use client';

import { useRouter } from 'next/navigation';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const floatingDonors = [
    { name: 'Jordan S.', amount: '$400', image: 'https://i.pravatar.cc/150?u=1' },
    { name: 'Maria T.', amount: '$250', image: 'https://i.pravatar.cc/150?u=2' },
    { name: 'David R.', amount: '$180', image: 'https://i.pravatar.cc/150?u=3' },
    { name: 'Sarah K.', amount: '$400', image: 'https://i.pravatar.cc/150?u=4' },
    { name: 'Alex M.', amount: '$320', image: 'https://i.pravatar.cc/150?u=5' },
    { name: 'Lisa P.', amount: '$150', image: 'https://i.pravatar.cc/150?u=6' },
];

const extendedDonors = Array.from({ length: 60 }).flatMap(() => floatingDonors);

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();
    const mobileScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if (mobileScrollRef.current) {
                const el = mobileScrollRef.current;
                const cards = Array.from(el.children) as HTMLElement[];
                if (cards.length === 0) return;

                // 1. Calculate the current center of the container
                const containerCenter = el.scrollLeft + (el.clientWidth / 2);
                
                // 2. Find which card is currently closest to the center
                let closestIndex = 0;
                let minDistance = Infinity;

                cards.forEach((card, index) => {
                    const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
                    const distance = Math.abs(containerCenter - cardCenter);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = index;
                    }
                });

                // 3. Target exactly one card ahead
                const nextIndex = closestIndex + 1;
                
                if (nextIndex >= cards.length) {
                    // Seamlessly loop back to start without animation
                    el.scrollTo({ left: 0, behavior: 'instant' } as any);
                } else {
                    const nextCard = cards[nextIndex];
                    const targetScroll = nextCard.offsetLeft - (el.clientWidth / 2) + (nextCard.offsetWidth / 2);
                    el.scrollTo({ left: targetScroll, behavior: 'smooth' });
                }
            }
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // TEMPORARY REDIRECT TO COMING SOON
        router.push('/coming-soon');

        // Uncomment below when API is ready
        /*
        const result = await login(email, password);
        if (result.success) {
            router.push('/dashboard');
        } else {
            setError(result.error || 'Invalid credentials. Please try again.');
        }
        */

        setLoading(false);
    };

    const handleGoogleSSO = () => {
        router.push('/coming-soon');
        // window.location.href = `${API_URL}/auth/google?redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
    };

    return (
        <div className={styles.loginPage}>
            {/* Grid background */}
            <div className={styles.gridBg} />

            {/* Floating Avatar Ring */}
            <div className={styles.avatarRing}>
                {floatingDonors.map((donor, i) => (
                    <div key={i} className={styles.floatingAvatar}>
                        <div className={styles.avatarImg}>
                            {donor.image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={donor.image} alt={donor.name} width={52} height={52} className={styles.profileImg} />
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M5 20c0-4 3.5-7 7-7s7 3 7 7" />
                                </svg>
                            )}
                        </div>
                        <span className={styles.avatarLabel}>{donor.name}</span>
                        <span className={styles.avatarDonation}>
                            Donated <strong>{donor.amount}</strong>🔥
                        </span>
                    </div>
                ))}
            </div>

            {/* Mobile Donors Slider */}
            <div className={styles.mobileDonorsWrapper}>
                <div className={styles.mobileDonorsScroll} ref={mobileScrollRef}>
                    {extendedDonors.map((donor, i) => (
                        <div key={i} className={styles.mobileDonorCard}>
                            <div className={styles.avatarImg}>
                                {donor.image ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={donor.image} alt={donor.name} width={38} height={38} className={styles.profileImg} />
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M5 20c0-4 3.5-7 7-7s7 3 7 7" />
                                    </svg>
                                )}
                            </div>
                            <div className={styles.mobileDonorInfo}>
                                <span className={styles.mobileDonorName}>{donor.name}</span>
                                <span className={styles.mobileDonorAmount}>Donated <strong>{donor.amount}</strong>🔥</span>
                            </div>
                        </div>
                    ))}
                </div>
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
                    Enter your credentials to access your account and manage your community impact.
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.fieldRow}>
                        <div className={styles.labelRow}>
                            <label htmlFor="email" className={styles.label}>Email Address</label>
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
                            <a href="#" className={styles.forgotLink}>Forgot?</a>
                        </div>
                        <input
                            id="password" type="password" className={styles.input}
                            placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            required suppressHydrationWarning
                        />
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Authenticating…' : 'Sign In'}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span className={styles.dividerLine} />
                    <span className={styles.dividerText}>Or sign in with</span>
                    <span className={styles.dividerLine} />
                </div>

                <div className={styles.socialRow}>
                    <button type="button" className={styles.socialBtn} onClick={handleGoogleSSO} aria-label="Google">
                        <span style={{ fontWeight: 'bold' }}>G</span>
                    </button>
                </div>

                <p className={styles.footer}>
                    New to Faith Fighter of America?{' '}
                    <a href="/register" className={styles.footerLink}>
                        Create an account
                    </a>
                </p>
            </div>
        </div>
    );
}

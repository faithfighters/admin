'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PLAN_CONFIG, PlanKey } from '@/lib/types';
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

function RegisterForm() {
    const searchParams = useSearchParams();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [plan, setPlan] = useState<PlanKey>((searchParams.get('plan') as PlanKey) || 'basic');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
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
        const result = await register(name, email, password, plan);
        if (result.success) {
            router.push('/dashboard');
        } else {
            setError(result.error || 'Registration failed. Please try again.');
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

                <h1 className={styles.title}>Create your account</h1>
                <p className={styles.subtitle}>
                    Join Faith Fighters of America and start making a difference in your community.
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className={styles.fieldRow} style={{ flex: 1 }}>
                            <div className={styles.labelRow}>
                                <label htmlFor="name" className={styles.label}>Full Name</label>
                            </div>
                            <input
                                id="name" type="text" className={styles.input}
                                placeholder="John Smith"
                                value={name} onChange={(e) => setName(e.target.value)}
                                required suppressHydrationWarning
                            />
                        </div>

                        <div className={styles.fieldRow} style={{ flex: 1 }}>
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
                    </div>

                    <div className={styles.fieldRow}>
                        <div className={styles.labelRow}>
                            <label htmlFor="password" className={styles.label}>Password</label>
                        </div>
                        <input
                            id="password" type="password" className={styles.input}
                            placeholder="Enter your password (min 8 characters)"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            minLength={8} required suppressHydrationWarning
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <div className={styles.labelRow}>
                            <label className={styles.label}>Select Your Plan</label>
                        </div>
                        <div className={styles.planGrid}>
                            {(Object.keys(PLAN_CONFIG) as PlanKey[]).map((key) => (
                                <div
                                    key={key}
                                    className={`${styles.planOption} ${plan === key ? styles.planOptionActive : ''} ${key === 'standard' ? styles.planPopular : ''}`}
                                    onClick={() => setPlan(key)}
                                >
                                    {key === 'standard' && <div className={styles.popularBadge}>POPULAR</div>}
                                    <div className={styles.planName}>{PLAN_CONFIG[key].name}</div>
                                    <div className={styles.planPrice}>${PLAN_CONFIG[key].price}/mo</div>
                                    <div className={styles.planVotes}>{PLAN_CONFIG[key].votes} vote{PLAN_CONFIG[key].votes > 1 ? 's' : ''}/cycle</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Creating account…' : 'Get started'}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span className={styles.dividerLine} />
                    <span className={styles.dividerText}>Or sign up with</span>
                    <span className={styles.dividerLine} />
                </div>

                <div className={styles.socialRow}>
                    <button type="button" className={styles.socialBtn} onClick={handleGoogleSSO} aria-label="Google">
                        <span style={{ fontWeight: 'bold' }}>G</span>
                    </button>
                </div>

                <p className={styles.footer}>
                    Already have an account?{' '}
                    <Link href="/login" className={styles.footerLink}>
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
            <RegisterForm />
        </Suspense>
    );
}

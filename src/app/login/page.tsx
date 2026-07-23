'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import styles from './page.module.css';
import { haptics } from '@/lib/haptics';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user, isAdmin, isLoading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) {
            if (isAdmin) {
                router.replace('/admin');
            }
        }
    }, [user, isAdmin, authLoading, router]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const err = params.get('error');
            if (err === 'unauthorized') {
                setError('Access denied. This portal is for admins and moderators only.');
            } else if (err === 'sso_invalid') {
                setError('The Single Sign-On link is invalid or has already been used.');
            } else if (err === 'sso_expired') {
                setError('The Single Sign-On session has expired. Please try again from the website.');
            } else if (err === 'sso_failed') {
                setError('Single Sign-On authentication failed. Please log in manually.');
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        haptics.tap();
        const result = await login(email, password);
        if (result.success) {
            if (result.role === 'admin' || result.role === 'moderator') {
                haptics.success();
                router.push('/admin');
            } else {
                haptics.error();
                setError('Access denied. This portal is for admins and moderators only.');
            }
        } else {
            haptics.error();
            setError(result.error || 'Invalid credentials. Please try again.');
        }
        setLoading(false);
    };

    const handleGoogleSSO = () => {
        haptics.tap();
        window.location.href = `/api/auth/google?redirect=${encodeURIComponent(window.location.origin + '/admin')}`;
    };

    return (
        <div className={styles.loginPage}>
            {/* Background */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/login_backgrounf_img.svg" alt="" className={styles.bgImage} aria-hidden />
            <div className={styles.bgOverlay} />

            {/* Wrapper keeps hero + card as one vertical unit */}
            <div className={styles.pageInner}>

            {/* Hero / branding section */}
            <div className={styles.heroSection}>
                <div className={styles.logoWrap}>
                    <div className={styles.logoIconBox}>
                        <img src="/images/login_hand_sign.svg" alt="Faith Fighters logo" className={styles.logoIcon}
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                    <div className={styles.logoText}>
                        FAITH <span>FIGHTERS</span>
                    </div>
                </div>
                <p className={styles.tagline}>Change lives. One vote at a time.</p>

                <h1 className={styles.heroHeadline}>
                    Welcome<br /><span>Back</span>
                </h1>
                <p className={styles.heroSub}>
                    Admin portal. Sign in to manage your community impact.
                </p>
            </div>

            {/* Form card */}
            <div className={styles.card}>
                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Email */}
                    <div className={styles.inputWrap}>
                        <span className={styles.inputIcon}><Mail size={17} /></span>
                        <input
                            id="email" type="email" className={styles.input}
                            placeholder="Email Address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required suppressHydrationWarning
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <div className={styles.labelRow}>
                            <span />
                            <Link href="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
                        </div>
                        <div className={styles.inputWrap}>
                            <span className={styles.inputIcon}><Lock size={17} /></span>
                            <input
                                id="password" type={showPassword ? 'text' : 'password'} className={styles.input}
                                style={{ paddingRight: '46px' }}
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required suppressHydrationWarning
                            />
                            <button type="button" className={styles.inputSuffix} onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span className={styles.dividerLine} />
                    <span className={styles.dividerText}>or continue with</span>
                    <span className={styles.dividerLine} />
                </div>

                <button type="button" className={styles.googleBtn} onClick={handleGoogleSSO}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>

                <p className={styles.footer}>
                    Need an admin account?{' '}
                    <Link href="/register" className={styles.footerLink}>Register</Link>
                </p>
            </div>

            </div>{/* end pageInner */}
        </div>
    );
}

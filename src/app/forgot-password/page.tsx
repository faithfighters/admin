'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Mail, Lock, CheckCircle2 } from 'lucide-react';
import styles from './page.module.css';
import OtpInput from '@/components/shared/OtpInput';

function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
    const [otpCode, setOtpCode] = useState('');
    const [timer, setTimer] = useState(0);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { forgotPasswordInitiate, forgotPasswordVerify } = useAuth();

    const startTimer = () => {
        setTimer(60);
        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) { setError('Email is required.'); return; }
        setLoading(true);
        const result = await forgotPasswordInitiate(email.trim().toLowerCase());
        setLoading(false);
        if (result.success) {
            setStep('otp');
            startTimer();
        } else {
            setError(result.error || 'Failed to send reset code. Please try again.');
        }
    };

    const handleVerifyAndReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (otpCode.length < 6) { setError('Please enter the 6-digit verification code.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setLoading(true);
        const result = await forgotPasswordVerify(email.trim().toLowerCase(), otpCode, password);
        setLoading(false);
        if (result.success) {
            setStep('success');
        } else {
            setError(result.error || 'Password reset failed. Check your OTP and try again.');
        }
    };

    const handleResendOtp = async () => {
        if (timer > 0) return;
        setLoading(true);
        setError('');
        const result = await forgotPasswordInitiate(email.trim().toLowerCase());
        setLoading(false);
        if (result.success) {
            startTimer();
            setOtpCode('');
        } else {
            setError(result.error || 'Failed to resend code. Please try again.');
        }
    };

    const handleBackToEmail = () => {
        setStep('email');
        setOtpCode('');
        setPassword('');
        setError('');
    };

    /* ── OTP step ── */
    if (step === 'otp') {
        return (
            <div className={styles.loginPage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/login_backgrounf_img.svg" alt="" className={styles.bgImage} aria-hidden />
                <div className={styles.bgOverlay} />
                <div style={{ flex: 1 }} />
                <div className={styles.cardCentered} style={{ margin: '0 16px 40px' }}>
                    <h1 className={styles.title}>Enter security code</h1>
                    <p className={styles.subtitle}>
                        We sent a 6-digit code to{' '}
                        <strong style={{ color: '#ffffff' }}>{email}</strong>.
                        Enter it below along with your new password.
                    </p>

                    {error && <div className={styles.error}>{error}</div>}

                    <form onSubmit={handleVerifyAndReset} className={styles.form}>
                        <div className={styles.fieldRow}>
                            <label className={styles.label} style={{ textAlign: 'center', display: 'block' }}>
                                Verification Code
                            </label>
                            <OtpInput value={otpCode} onChange={setOtpCode} disabled={loading} error={!!error} />
                        </div>

                        <div className={styles.inputWrap}>
                            <span className={styles.inputIcon}><Lock size={17} /></span>
                            <input
                                id="password" type={showPassword ? 'text' : 'password'}
                                className={styles.input}
                                style={{ paddingRight: '46px' }}
                                placeholder="New password (min 8 chars)"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required suppressHydrationWarning
                            />
                            <button
                                type="button"
                                className={styles.inputSuffix}
                                onClick={() => setShowPassword(v => !v)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading || otpCode.length < 6 || password.length < 8}
                        >
                            {loading ? 'Resetting password…' : 'Reset Password'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                        {timer > 0 ? (
                            <span>Resend code in <strong style={{ color: '#ffffff' }}>{timer}s</strong></span>
                        ) : (
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={loading}
                                style={{ background: 'none', border: 'none', color: '#f97316', fontWeight: 700, cursor: 'pointer', padding: '4px', fontFamily: 'inherit' }}
                            >
                                Resend Code
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleBackToEmail}
                        disabled={loading}
                        style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        ← Use a different email
                    </button>
                </div>
            </div>
        );
    }

    /* ── Success step ── */
    if (step === 'success') {
        return (
            <div className={styles.loginPage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/login_backgrounf_img.svg" alt="" className={styles.bgImage} aria-hidden />
                <div className={styles.bgOverlay} />
                <div style={{ flex: 1 }} />
                <div className={styles.cardCentered} style={{ margin: '0 16px 40px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <CheckCircle2 size={48} color="#F8C38F" />
                    </div>
                    <h1 className={styles.title}>Password updated!</h1>
                    <p className={styles.subtitle} style={{ marginBottom: '24px' }}>
                        Your password has been successfully reset. You can now sign in with your new password.
                    </p>
                    <Link href="/login" className={styles.submitBtn}>
                        Back to Sign In
                    </Link>
                </div>
            </div>
        );
    }

    /* ── Email step (default) ── */
    return (
        <div className={styles.loginPage}>
            {/* Background */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/login_backgrounf_img.svg" alt="" className={styles.bgImage} aria-hidden />
            <div className={styles.bgOverlay} />

            <div className={styles.pageInner}>

                {/* Hero / branding section */}
                <div className={styles.heroSection}>
                    <div className={styles.logoWrap}>
                        <div className={styles.logoIconBox}>
                            <img
                                src="/images/login_hand_sign.svg"
                                alt="Faith Fighters logo"
                                className={styles.logoIcon}
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                        <div className={styles.logoText}>
                            FAITH <span>FIGHTERS</span>
                        </div>
                    </div>
                    <p className={styles.tagline}>Change lives. One vote at a time.</p>

                    <h1 className={styles.heroHeadline}>
                        Reset Your<br /><span>Password</span>
                    </h1>
                    <p className={styles.heroSub}>
                        Enter your email and we&apos;ll send you a code to reset your password.
                    </p>
                </div>

                {/* Form card */}
                <div className={styles.card}>
                    {error && <div className={styles.error}>{error}</div>}

                    <form onSubmit={handleSendOtp} className={styles.form}>
                        <div className={styles.inputWrap}>
                            <span className={styles.inputIcon}><Mail size={17} /></span>
                            <input
                                id="email"
                                type="email"
                                className={styles.input}
                                placeholder="Email Address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                suppressHydrationWarning
                            />
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Sending code…' : 'Send Reset Code'}
                        </button>
                    </form>

                    <p className={styles.footer} style={{ marginTop: '24px' }}>
                        Remembered your password?{' '}
                        <Link href="/login" className={styles.footerLink}>Sign in</Link>
                    </p>
                </div>

            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>}>
            <ForgotPasswordForm />
        </Suspense>
    );
}

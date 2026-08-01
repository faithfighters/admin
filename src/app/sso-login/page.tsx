'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

// Module-level set survives StrictMode unmount/remount cycles (unlike useRef)
const processedTokens = new Set<string>();

export default function SsoLoginPage() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('Verifying your credentials...');

  useEffect(() => {

    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');

    // Prevent double-exchange when React StrictMode unmounts and remounts the component
    if (token && processedTokens.has(token)) return;
    if (token) processedTokens.add(token);

    if (!token) {
      setStatus('error');
      setErrorMessage('No authentication token provided.');
      const timeout = setTimeout(() => {
        router.replace('/login?error=sso_failed');
      }, 2000);
      return () => clearTimeout(timeout);
    }

    let isSubscribed = true;

    async function handleSso() {
      try {
        // 10s timeout so a slow/hanging backend never leaves user on a spinner
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `/api/auth/sso?token=${encodeURIComponent(token!)}`,
          { signal: controller.signal },
        );
        clearTimeout(timeoutId);

        if (!isSubscribed) return;

        if (response.ok) {
          setStatus('success');
          setErrorMessage('Authenticated successfully! Redirecting...');
          // Refresh context but don't block redirect if it hangs
          refreshUser().catch(() => {});
          setTimeout(() => {
            router.replace('/admin');
          }, 800);
        } else {
          setStatus('error');
          if (response.status === 401) {
            setErrorMessage('The authentication token is invalid or has expired.');
            setTimeout(() => {
              router.replace('/login?error=sso_expired');
            }, 2500);
          } else {
            setErrorMessage('An unexpected error occurred during authentication.');
            setTimeout(() => {
              router.replace('/login?error=sso_failed');
            }, 2500);
          }
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        setStatus('error');
        const msg = err?.name === 'AbortError'
          ? 'Authentication timed out. Please try again.'
          : 'Failed to connect to the authentication server.';
        setErrorMessage(msg);
        setTimeout(() => {
          router.replace('/login?error=sso_failed');
        }, 2500);
      }
    }

    handleSso();

    return () => {
      isSubscribed = false;
    };
  }, [router, refreshUser]);

  return (
    <div className={styles.ssoPage}>
      <div className={styles.gridBg} />

      <div className={styles.card}>
        {/* Brand icon */}
        <div className={styles.brandIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </div>

        {status === 'loading' && (
          <>
            <h1 className={styles.title}>Secure Login</h1>
            <p className={styles.subtitle}>{errorMessage}</p>
            <div className={styles.spinnerWrapper}>
              <div className={styles.spinner} />
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.successCheck}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>{errorMessage}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.errorCross}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h1 className={styles.title}>Authentication Failed</h1>
            <p className={styles.subtitle}>{errorMessage}</p>
            <button
              onClick={() => router.push('/login')}
              className={styles.actionBtn}
            >
              Sign In Manually
            </button>
            <button
              onClick={() => window.location.href = 'https://stage.faithfightersforamerica.com'}
              className={`${styles.actionBtn} ${styles.secondaryBtn}`}
            >
              Back to Main Website
            </button>
          </>
        )}
      </div>
    </div>
  );
}

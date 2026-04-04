'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminLayout.module.css';

const navItems = [
    { label: 'Dashboard', href: '/admin', icon: '📊' },
    { label: 'Charities', href: '/admin/charities', icon: '📋' },
    { label: 'Video Submission', href: '/admin/videos', icon: '🎬' },
    { label: 'Voting Cycles', href: '/admin/votes', icon: '🗳️' },
    { label: 'Members', href: '/admin/members', icon: '👥' },
    { label: 'Payouts', href: '/admin/payouts', icon: '💳' },
    { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
];

const bottomItems = [
    { label: 'My Profile', href: '/admin/profile', icon: '👤' },
    { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading: loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'admin' && user.role !== 'moderator'))) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    if (loading) {
        return (
            <div className={styles.adminContainer} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#64748b', fontSize: 14 }}>Loading…</p>
            </div>
        );
    }

    if (!user) return null;

    const firstName = user.name?.split(' ')[0] || 'Admin';

    return (
        <div className={styles.adminContainer}>
            {/* Mobile overlay */}
            <div
                className={`${styles.mobileOverlay} ${mobileOpen ? styles.overlayVisible : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logoBadge}>
                        <div className={styles.logoIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="7" y1="17" x2="17" y2="7" />
                                <polyline points="7 7 17 7 17 17" />
                            </svg>
                        </div>
                        <span className={styles.logoText}>FFFA</span>
                    </div>
                    <div className={styles.toggleArrows}>
                        <button className={styles.toggleArrow} aria-label="Previous">&lsaquo;</button>
                        <button className={styles.toggleArrow} aria-label="Next">&rsaquo;</button>
                    </div>
                </div>

                <nav className={styles.sidebarNav}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.push(item.href);
                                }}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                <span className={styles.navLabel}>{item.label}</span>
                            </a>
                        );
                    })}
                </nav>

                <div className={styles.sidebarFooter}>
                    {bottomItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.push(item.href);
                                }}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                <span className={styles.navLabel}>{item.label}</span>
                            </a>
                        );
                    })}
                    <button
                        className={`${styles.navLink} ${styles.logoutBtn}`}
                        onClick={async () => { await logout(); router.replace('/login'); }}
                    >
                        <span className={styles.navIcon}>🚪</span>
                        <span className={styles.navLabel}>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className={styles.mainContent}>
                {/* Top bar */}
                <header className={styles.topbar}>
                    <button
                        className={styles.menuToggle}
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        ☰
                    </button>

                    <div className={styles.searchBar}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input type="text" className={styles.searchInput} placeholder="Search..." />
                        <span className={styles.searchShortcut}>
                            <span className={styles.shortcutKey}>⌘</span>
                            <span className={styles.shortcutKey}>F</span>
                        </span>
                    </div>

                    <div className={styles.topbarRight}>
                        <button className={styles.notificationBtn} aria-label="Notifications">
                            🔔
                        </button>
                        <div className={styles.userProfile}>
                            <div className={styles.userAvatar}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M5 20c0-4 3.5-7 7-7s7 3 7 7" />
                                </svg>
                            </div>
                            <span className={styles.userName}>{firstName}</span>
                            <span className={styles.userDropdown}>▾</span>
                        </div>
                    </div>
                </header>

                <main className={styles.contentWrapper}>
                    {children}
                </main>
            </div>
        </div>
    );
}

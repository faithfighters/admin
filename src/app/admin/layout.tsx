'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminLayout.module.css';

import { 
    LayoutDashboard, 
    Grid, 
    Video, 
    Trophy, 
    Activity, 
    CreditCard, 
    Folder, 
    User, 
    Settings,
    LogOut,
    Search,
    Bell,
    ChevronDown,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
    { label: 'All Campaigns', href: '/admin/charities', icon: <Grid size={20} /> },
    { label: 'Video Submission', href: '/admin/videos', icon: <Video size={20} /> },
    { label: 'Leaderboard', href: '/admin/leaderboard', icon: <Trophy size={20} /> },
    { label: 'Activities', href: '/admin/activities', icon: <Activity size={20} /> },
    { label: 'Subscription', href: '/admin/payouts', icon: <CreditCard size={20} /> },
    { label: 'Reports', href: '/admin/reports', icon: <Folder size={20} /> },
];

const bottomItems = [
    { label: 'My Profile', href: '/admin/profile', icon: <User size={20} /> },
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                        </div>
                        <span className={styles.logoText}>OFFFA</span>
                    </div>
                    <div className={styles.toggleArrows}>
                        <button className={styles.toggleArrow} aria-label="Previous">
                            <ArrowLeft size={12} />
                        </button>
                        <button className={styles.toggleArrow} aria-label="Next">
                            <ArrowRight size={12} />
                        </button>
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
                        <span className={styles.navIcon}><LogOut size={20} /></span>
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
                        <span className={styles.searchIcon}><Search size={18} /></span>
                        <input type="text" className={styles.searchInput} placeholder="Search" />
                        <span className={styles.searchShortcut}>
                            <span className={styles.shortcutKey}>⌘</span>
                            <span className={styles.shortcutKey}>F</span>
                        </span>
                    </div>

                    <div className={styles.topbarRight}>
                        <button className={styles.notificationBtn} aria-label="Notifications">
                            <Bell size={20} />
                        </button>
                        <div className={styles.userProfile}>
                            <div className={styles.userAvatar}>
                                {user.image ? (
                                    <img src={user.image} alt={firstName} />
                                ) : (
                                    <User size={22} />
                                )}
                            </div>
                            <span className={styles.userName}>{firstName}</span>
                            <span className={styles.userDropdown}><ChevronDown size={14} /></span>
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

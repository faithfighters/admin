'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { haptic } from '@/lib/haptics';
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
    Users,
    LogOut,
    Search,
    ChevronDown,
    ChevronRight,
    Calendar,
    Menu,
    Moon,
    Sun,
    PanelLeftClose,
    PanelLeftOpen,
    HeartHandshake,
    Mail,
    FileEdit,
} from 'lucide-react';
import NotificationBell from '@/components/shared/NotificationBell';

const SEGMENT_NAMES: Record<string, string> = {
    admin: 'Admin',
    charities: 'All Campaigns',
    videos: 'Video Submission',
    members: 'Members',
    analytics: 'Analytics',
    payouts: 'Charity Payouts',
    events: 'Events',
    reports: 'Reports',
    activities: 'Activities',
    settings: 'Settings',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    rfa: 'Assistance Requests',
    volunteers: 'Volunteers',
    messages: 'Contact Messages',
    'page-content': 'Page Content',
};

const BOTTOM_NAV = [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={22} /> },
    { label: 'Campaigns', href: '/admin/charities', icon: <Grid size={22} /> },
    { label: 'Members', href: '/admin/members', icon: <Users size={22} /> },
    { label: 'Analytics', href: '/admin/analytics', icon: <Activity size={22} /> },
];

const NAV_SECTIONS = [
    {
        label: 'PLATFORM',
        items: [
            { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} />, adminOnly: false },
            { label: 'All Campaigns', href: '/admin/charities', icon: <Grid size={20} />, adminOnly: false },
            { label: 'Video Submission', href: '/admin/videos', icon: <Video size={20} />, adminOnly: false },
            { label: 'Leaderboard', href: '/admin/leaderboard', icon: <Trophy size={20} />, adminOnly: false },
            { label: 'Page Content', href: '/admin/page-content', icon: <FileEdit size={20} />, adminOnly: false },
        ],
    },
    {
        label: 'MANAGEMENT',
        items: [
            { label: 'Members', href: '/admin/members', icon: <Users size={20} />, adminOnly: false },
            { label: 'Assistance Requests', href: '/admin/rfa', icon: <HeartHandshake size={20} />, adminOnly: false },
            { label: 'Volunteers', href: '/admin/volunteers', icon: <Users size={20} />, adminOnly: false },
            { label: 'Contact Messages', href: '/admin/messages', icon: <Mail size={20} />, adminOnly: false },
            { label: 'Charity Payouts', href: '/admin/payouts', icon: <CreditCard size={20} />, adminOnly: false },
            { label: 'Events', href: '/admin/events', icon: <Calendar size={20} />, adminOnly: false },
            { label: 'Analytics', href: '/admin/analytics', icon: <Activity size={20} />, adminOnly: false },
        ],
    },
    {
        label: 'SYSTEM',
        items: [
            { label: 'Activities', href: '/admin/activities', icon: <Activity size={20} />, adminOnly: false },
            { label: 'Reports', href: '/admin/reports', icon: <Folder size={20} />, adminOnly: true },
        ],
    },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const { user, isLoading: loading, isAdmin, logout } = useAuth();
    const { theme, toggle: toggleTheme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const stored = localStorage.getItem('fffa-sidebar-collapsed');
        if (stored === 'true') setSidebarCollapsed(true);
    }, []);

    const handleCollapseToggle = () => {
        haptic('light');
        setSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('fffa-sidebar-collapsed', String(next));
            return next;
        });
    };

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchValue.trim()) {
            router.push(`/admin/charities?q=${encodeURIComponent(searchValue.trim())}`);
            setSearchValue('');
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login');
            } else if (!isAdmin) {
                router.replace('/login?error=unauthorized');
            }
        }
    }, [user, isAdmin, loading, router]);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Build breadcrumbs from pathname
    const breadcrumbs = (() => {
        const segments = (pathname || '').split('/').filter(Boolean);
        return segments.map((seg, i) => ({
            name: SEGMENT_NAMES[seg] || seg,
            href: '/' + segments.slice(0, i + 1).join('/'),
            isLast: i === segments.length - 1,
        }));
    })();

    if (loading) {
        return (
            <div className={styles.adminContainer} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading…</p>
            </div>
        );
    }

    if (!user || !isAdmin) return null;

    const firstName = user.name?.split(' ')[0] || 'Admin';

    return (
        <div className={styles.adminContainer}>
            {/* Mobile overlay */}
            <div
                className={`${styles.mobileOverlay} ${mobileOpen ? styles.overlayVisible : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logoBadge}>
                        {sidebarCollapsed ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src="/images/favicon.png" alt="Faith Fighters logo" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src="/images/FFFA_logo_Horizontal.svg" alt="Faith Fighters logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
                        )}
                    </div>
                    <div className={styles.toggleArrows}>
                        <button
                            className={styles.collapseBtn}
                            onClick={handleCollapseToggle}
                            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                        </button>
                    </div>
                </div>

                <nav className={styles.sidebarNav}>
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.label}>
                            <div className={styles.navSectionLabel}>{section.label}</div>
                            {section.items.filter(item => !item.adminOnly || isAdmin).map((item) => {
                                const isActive = pathname === item.href ||
                                    (item.href !== '/admin' && pathname.startsWith(item.href));
                                return (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            haptic('selection');
                                            router.push(item.href);
                                        }}
                                    >
                                        <span className={styles.navIcon}>{item.icon}</span>
                                        <span className={styles.navLabel}>{item.label}</span>
                                    </a>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className={styles.sidebarFooter} />
            </aside>

            {/* Main */}
            <div className={styles.mainContent}>
                {/* Top bar */}
                <header className={styles.topbar}>
                    <button
                        className={styles.menuToggle}
                        onClick={() => { haptic('light'); setMobileOpen(!mobileOpen); }}
                        aria-label="Toggle menu"
                    >
                        <Menu size={22} />
                    </button>

                    <div className={styles.searchBar}>
                        <span className={styles.searchIcon}><Search size={18} /></span>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search campaigns…"
                            aria-label="Search campaigns"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>

                    <div className={styles.topbarRight}>
                        <button
                            className={styles.themeToggle}
                            onClick={() => { haptic('light'); toggleTheme(); }}
                            aria-label="Toggle dark mode"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <NotificationBell />
                        <div className={styles.userProfileWrapper} ref={userMenuRef}>
                            <div className={styles.userProfile} onClick={() => { haptic('light'); setUserMenuOpen(o => !o); }}>
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
                            {userMenuOpen && (
                                <div className={styles.userMenu}>
                                    <button
                                        className={styles.userMenuItem}
                                        onClick={() => { haptic('light'); setUserMenuOpen(false); router.push('/admin/profile'); }}
                                    >
                                        <User size={15} /> My Profile
                                    </button>
                                    <div className={styles.userMenuDivider} />
                                    <button
                                        className={`${styles.userMenuItem} ${styles.userMenuItemDanger}`}
                                        onClick={async () => { haptic('light'); setUserMenuOpen(false); await logout(); router.replace('/login'); }}
                                    >
                                        <LogOut size={15} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Breadcrumb bar */}
                {breadcrumbs.length > 0 && (
                    <div className={styles.breadcrumb}>
                        {breadcrumbs.map((crumb, i) => (
                            <span key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {i > 0 && <ChevronRight size={10} className={styles.breadcrumbSep} />}
                                {crumb.isLast ? (
                                    <span className={styles.breadcrumbCurrent}>{crumb.name}</span>
                                ) : (
                                    <span>{crumb.name}</span>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                <main className={styles.contentWrapper}>
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className={styles.bottomNav}>
                {BOTTOM_NAV.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/admin' && pathname.startsWith(item.href));
                    return (
                        <a
                            key={item.href}
                            href={item.href}
                            className={`${styles.bottomNavItem} ${isActive ? styles.bottomNavActive : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                haptic('selection');
                                router.push(item.href);
                            }}
                            aria-label={item.label}
                        >
                            {item.icon}
                            <span className={styles.bottomNavLabel}>{item.label}</span>
                        </a>
                    );
                })}
            </nav>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </ThemeProvider>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import VideoPlayerModal from '@/components/shared/VideoPlayerModal';
import { Play, Flame, Users, DollarSign, BarChart3, ArrowRight, TrendingUp, TrendingDown, Activity, CheckCircle, Clock, UserPlus, Vote, Film, Shield, Bookmark, Minus, BarChart2, LineChart } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import type { ReactNode } from 'react';

interface DashStats {
    totalMembers: number;
    totalRevenue: number;
    monthlyRevenue: number;
    activeCauses: number;
    totalVotes: number;
    pendingVideos: number;
}

interface ActivityItem {
    id: string;
    text: string;
    time: string;
    icon: ReactNode;
    type: 'member' | 'vote' | 'cause';
}

const SPARKLINE_DATA = [40, 55, 48, 62, 58, 72, 65];

function Sparkline({ color }: { color: string }) {
    const max = Math.max(...SPARKLINE_DATA);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '28px', marginTop: '10px' }}>
            {SPARKLINE_DATA.map((v, i) => (
                <div
                    key={i}
                    style={{
                        flex: 1,
                        height: `${(v / max) * 100}%`,
                        borderRadius: '3px 3px 0 0',
                        background: i === SPARKLINE_DATA.length - 1 ? color : `${color}55`,
                        transition: 'height 0.3s',
                    }}
                />
            ))}
        </div>
    );
}

export default function AdminOverviewContent() {
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashStats | null>(null);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [communityVideos, setCommunityVideos] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    const firstName = user?.name?.split(' ')[0] || 'Admin';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [analyticsRes, actRes, videosRes] = await Promise.all([
                    fetch('/api/admin/analytics', { credentials: 'include' }),
                    fetch('/api/admin/activities', { credentials: 'include' }),
                    fetch('/api/admin/videos', { credentials: 'include' }),
                ]);

                if (!analyticsRes.ok) throw new Error('Failed to load analytics');
                const data = await analyticsRes.json();
                setStats({
                    totalMembers: data.totalMembers ?? 0,
                    totalRevenue: data.totalRevenue ?? 0,
                    monthlyRevenue: data.monthlyRevenue ?? 0,
                    activeCauses: data.activeCauses ?? 0,
                    totalVotes: data.totalVotes ?? 0,
                    pendingVideos: data.videoStats?.pending ?? 0,
                });

                if (actRes.ok) {
                    const actData = await actRes.json();
                    const items = (actData.activities ?? []).slice(0, 6);
                    setActivities(items.map((a: { id: string; type: string; title: string; description: string; user: string; timestamp: string }) => ({
                        id: a.id,
                        text: a.description,
                        time: (() => {
                            const d = new Date(a.timestamp);
                            const diffMs = Date.now() - d.getTime();
                            const mins = Math.floor(diffMs / 60000);
                            if (mins < 60) return `${mins}m ago`;
                            const hrs = Math.floor(mins / 60);
                            if (hrs < 24) return `${hrs}h ago`;
                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        })(),
                        icon: a.type === 'signup' ? <UserPlus size={16} color="#60a5fa" /> : a.type === 'vote' ? <Vote size={16} color="#F8C38F" /> : a.type === 'submission' ? <Film size={16} color="#a78bfa" /> : a.type === 'moderation' ? <Shield size={16} color="#fbbf24" /> : <Bookmark size={16} color="rgba(255,255,255,0.5)" />,
                        type: a.type === 'signup' ? 'member' : a.type === 'vote' ? 'vote' : 'cause',
                    })));
                }

                if (videosRes.ok) {
                    const videosData = await videosRes.json();
                    setCommunityVideos((videosData.videos || []).slice(0, 4));
                }
            } catch {
                setStats({ totalMembers: 0, totalRevenue: 0, monthlyRevenue: 0, activeCauses: 0, totalVotes: 0, pendingVideos: 0 });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ height: '180px', borderRadius: '28px', background: 'linear-gradient(135deg, #1e1b4b, #E7421B)', opacity: 0.12 }} />
                <div className="admin-stat-grid">
                    {[...Array(4)].map((_, i) => <div key={i} style={{ height: '130px', borderRadius: '20px', background: '#15131f' }} />)}
                </div>
            </div>
        );
    }

    const statCards: {
        icon: ReactNode;
        color: string;
        bg: string;
        value: string | number;
        label: string;
        badge: string;
        trend: 'up' | 'down' | 'neutral';
        href: string;
    }[] = [
        { icon: <Users size={20} />, color: '#60a5fa', bg: 'rgba(59,130,246,0.15)', value: stats?.totalMembers ?? 0, label: 'Total Members', badge: '+12% this month', trend: 'up', href: '/admin/members' },
        { icon: <DollarSign size={20} />, color: '#4ade80', bg: 'rgba(34,197,94,0.15)', value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`, label: 'Total Revenue', badge: 'All time', trend: 'up', href: '/admin/analytics' },
        { icon: <Flame size={20} />, color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', value: stats?.activeCauses ?? 0, label: 'Active Causes', badge: 'Live', trend: 'neutral', href: '/admin/charities' },
        { icon: <BarChart3 size={20} />, color: '#a78bfa', bg: 'rgba(139,92,246,0.15)', value: stats?.totalVotes ?? 0, label: 'Total Votes Cast', badge: 'This cycle', trend: 'up', href: '/admin/members' },
    ];

    const quickActions = [
        { icon: <CheckCircle size={20} />, label: 'Review Videos', desc: 'Approve or reject submissions', href: '/admin/videos', color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
        { icon: <Users size={20} />, label: 'Manage Members', desc: 'View and manage all users', href: '/admin/members', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
        { icon: <Activity size={20} />, label: 'View Reports', desc: 'Flagged content moderation', href: '/admin/reports', color: '#F8C38F', bg: 'rgba(231,66,27,0.12)' },
        { icon: <BarChart2 size={20} />, label: 'View Analytics', desc: 'Platform growth & revenue', href: '/admin/analytics', color: '#a78bfa', bg: 'rgba(139,92,246,0.12)' },
        { icon: <LineChart size={20} />, label: 'Activity Logs', desc: 'Full platform activity stream', href: '/admin/activities', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },
    ];

    const monthlyRevenue = stats?.monthlyRevenue ?? 0;
    const charityPool = Math.round(monthlyRevenue * 0.8);
    const platformCut = monthlyRevenue - charityPool;

    return (
        <div style={{ paddingBottom: '40px', minWidth: 0, overflow: 'hidden' }}>
            <style>{`
                /* ── Hero ── */
                .admin-hero { display: flex; align-items: center; justify-content: space-between; padding: 40px 48px; }
                .admin-hero-chips { position: relative; z-index: 1; display: flex; gap: 12px; flex-shrink: 0; }
                /* ── Stat cards ── */
                .admin-stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 32px; }
                .admin-stat-value { font-size: 30px; font-weight: 900; color: #ffffff; letter-spacing: -1px; margin-bottom: 4px; }
                .admin-stat-badge { display: flex; align-items: center; gap: 4px; max-width: 50%; }
                .admin-stat-badge-text { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.08); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
                /* ── Two-col section ── */
                .admin-two-col { display: grid; grid-template-columns: 1fr 340px; gap: 20px; margin-bottom: 28px; }
                /* ── Video grid ── */
                .admin-video-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; overflow: hidden; }
                /* ── Revenue header ── */
                .admin-revenue-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                /* ── Quick actions ── */
                .admin-quick-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; }
                .admin-quick-card { display: block; padding: 22px; border-radius: 20px; text-decoration: none; border: 1px solid rgba(255,255,255,0.06); transition: transform 0.2s, box-shadow 0.2s; }
                .admin-quick-label { font-size: 14px; font-weight: 800; color: #ffffff; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
                /* ── System health ── */
                .admin-health-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }

                @media (max-width: 768px) {
                    /* Hero */
                    .admin-hero { flex-direction: column !important; align-items: flex-start !important; padding: 24px 20px !important; min-height: auto !important; gap: 16px; }
                    .admin-hero h1 { font-size: 26px !important; }
                    .admin-hero-text-sub { display: none !important; }
                    .admin-hero-chips { width: 100%; }
                    .admin-hero-chips button { flex: 1 !important; padding: 10px 12px !important; }
                    /* Stat cards */
                    .admin-stat-grid { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; margin-bottom: 20px !important; }
                    .admin-stat-value { font-size: 22px !important; }
                    .admin-stat-badge-text { display: none; }
                    /* Two-col → single col */
                    .admin-two-col { grid-template-columns: 1fr !important; }
                    /* Video grid → 2-col on mobile so reels stack vertically, no sideways scroll */
                    .admin-video-grid { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; width: 100% !important; }
                    /* Revenue header → stack */
                    .admin-revenue-header { flex-direction: column !important; gap: 8px !important; }
                    /* Quick actions → 2-col */
                    .admin-quick-grid { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; }
                    .admin-quick-card { padding: 16px !important; border-radius: 16px !important; }
                    .admin-quick-label { font-size: 13px !important; }
                    /* Health → 2-col */
                    .admin-health-grid { grid-template-columns: repeat(2,1fr) !important; }
                    /* Pending banner — stack on very small topbars */
                    .admin-pending-banner { flex-direction: column !important; align-items: flex-start !important; }
                }
                @media (max-width: 480px) {
                    .admin-hero { padding: 18px 16px !important; gap: 12px; }
                    .admin-hero h1 { font-size: 20px !important; }
                    .admin-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
                    .admin-stat-value { font-size: 18px !important; }
                    .admin-quick-grid { grid-template-columns: repeat(2,1fr) !important; }
                    .admin-health-grid { grid-template-columns: 1fr !important; }
                    .admin-video-grid { grid-template-columns: 1fr !important; gap: 8px !important; width: 100% !important; }
                }
            `}</style>

            {/* ── Pending Videos Banner ───────────────────── */}
            {(stats?.pendingVideos ?? 0) > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', marginBottom: '20px',
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px',
                    gap: '12px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>⚡</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24' }}>
                            {stats?.pendingVideos} video{(stats?.pendingVideos ?? 0) > 1 ? 's' : ''} awaiting moderation
                        </span>
                    </div>
                    <button
                        onClick={() => { haptic('selection'); router.push('/admin/videos'); }}
                        style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                    >
                        Review Now
                    </button>
                </div>
            )}

            {/* ── Hero Banner ─────────────────────────────── */}
            <div className="admin-hero" style={{
                position: 'relative', borderRadius: '28px', overflow: 'hidden',
                background: 'linear-gradient(135deg, #0f0c29 0%, #1e1b4b 50%, #16213e 100%)',
                padding: '40px 48px', marginBottom: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                minHeight: '165px',
            }}>
                <div style={{ position: 'absolute', top: '-60px', right: '100px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', filter: 'blur(80px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-40px', left: '280px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', filter: 'blur(60px)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Admin Control Center</p>
                    <h1 style={{ fontSize: '36px', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: '10px' }}>
                        Welcome, <span style={{ background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{firstName}</span>
                    </h1>
                    <p className="admin-hero-text-sub" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                        {stats?.activeCauses} active campaigns · {stats?.totalMembers} members · {stats?.totalVotes} votes cast
                    </p>
                </div>

                <div className="admin-hero-chips" style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px' }}>
                    {[
                        { label: 'Pending Review', value: stats?.pendingVideos ?? 0, icon: <Clock size={14} color="#fbbf24" />, href: '/admin/videos' },
                        { label: 'All Campaigns', value: stats?.activeCauses ?? 0, icon: <TrendingUp size={14} color="#34d399" />, href: '/admin/charities' },
                    ].map(chip => (
                        <button
                            key={chip.label}
                            onClick={() => router.push(chip.href)}
                            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '14px 20px', textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>{chip.icon}</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{chip.value}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{chip.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Stat Cards ──────────────────────────────── */}
            <div className="admin-stat-grid">
                {statCards.map((s, i) => (
                    <div
                        key={i}
                        onClick={() => { haptic('selection'); router.push(s.href); }}
                        style={{ background: '#15131f', borderRadius: '20px', padding: '22px 24px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)'; }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                            <div className="admin-stat-badge">
                                {s.trend === 'up' && <TrendingUp size={14} color="#10b981" />}
                                {s.trend === 'down' && <TrendingDown size={14} color="#F8C38F" />}
                                {s.trend === 'neutral' && <Minus size={14} color="rgba(255,255,255,0.4)" />}
                                <span className="admin-stat-badge-text">{s.badge}</span>
                            </div>
                        </div>
                        <div className="admin-stat-value" style={{ fontSize: '30px', fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', marginBottom: '4px' }}>{s.value}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                        <Sparkline color={s.color} />
                    </div>
                ))}
            </div>

            {/* ── Two-col: Videos + Activity ──────────────── */}
            <div className="admin-two-col">

                {/* Recent Campaigns */}
                <div style={{ background: '#15131f', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>Recent Campaigns</h2>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Latest submitted video reels</p>
                        </div>
                        <button
                            onClick={() => router.push('/admin/charities')}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            View All <ArrowRight size={12} />
                        </button>
                    </div>

                    {communityVideos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)' }}>
                            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg></div>
                            <p style={{ fontWeight: 600 }}>No campaigns yet</p>
                        </div>
                    ) : (
                        <div className="admin-video-grid">
                            {communityVideos.map(video => (
                                <div
                                    key={video.id}
                                    onClick={() => setSelectedVideo(video)}
                                    onMouseEnter={() => setHoveredCard(video.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    style={{
                                        position: 'relative', borderRadius: '16px', overflow: 'hidden',
                                        aspectRatio: '9/14', background: '#0b0a12', cursor: 'pointer',
                                        boxShadow: hoveredCard === video.id ? '0 12px 36px rgba(231,66,27,0.25)' : '0 2px 8px rgba(0,0,0,0.3)',
                                        transform: hoveredCard === video.id ? 'translateY(-4px)' : 'none',
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    {video.thumbnailUrl ? (
                                        <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hoveredCard === video.id ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.4s' }} />
                                    ) : video.videoUrl ? (
                                        <video src={video.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="none" muted playsInline />
                                    ) : null}
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />

                                    {/* Status badge */}
                                    <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '50px', background: video.status === 'approved' ? 'rgba(34,197,94,0.15)' : video.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(231,66,27,0.15)', color: video.status === 'approved' ? '#4ade80' : video.status === 'pending' ? '#fbbf24' : '#F8C38F' }}>
                                        {video.status}
                                    </div>

                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hoveredCard === video.id ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Play size={13} color="white" fill="white" />
                                        </div>
                                    </div>

                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'white', lineHeight: 1.3, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>By {video.authorName}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div style={{ background: '#15131f', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>Recent Activity</h2>
                        {activities.length > 0 && (
                            <button
                                onClick={() => setActivities([])}
                                style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F8C38F'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(231,66,27,0.4)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                            >
                                Dismiss all
                            </button>
                        )}
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>Latest joins, votes & submissions</p>

                    {activities.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No recent activity</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activities.map(act => (
                                <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{act.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.text}</div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{act.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Revenue Widget ──────────────────────────── */}
            <div style={{ background: '#15131f', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '28px' }}>
                <div className="admin-revenue-header">
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>Monthly Revenue Breakdown</h2>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>80% to charity pool · 20% platform operations</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>${monthlyRevenue.toLocaleString()}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>This month</div>
                    </div>
                </div>

                {/* Split bar */}
                <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', height: '36px', marginBottom: '16px' }}>
                    <div style={{ flex: 80, background: 'linear-gradient(90deg, #16a34a, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white', gap: '6px' }}>
                        80% Charity Pool
                    </div>
                    <div style={{ flex: 20, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white' }}>
                        20% Ops
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.12)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.25)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Charity Pool</div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#4ade80' }}>${charityPool.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Platform</div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>${platformCut.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ───────────────────────────── */}
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>Quick Actions</h2>
                <div className="admin-quick-grid">
                    {quickActions.map(action => (
                        <a
                            key={action.href}
                            href={action.href}
                            className="admin-quick-card"
                            onClick={e => { e.preventDefault(); haptic('selection'); router.push(action.href); }}
                            style={{ display: 'block', padding: '22px', background: action.bg, borderRadius: '20px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                        >
                            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#15131f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color, marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                                {action.icon}
                            </div>
                            <div className="admin-quick-label" style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {action.label} <ArrowRight size={13} color="rgba(255,255,255,0.4)" />
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{action.desc}</div>
                        </a>
                    ))}
                </div>
            </div>

            {/* ── System Health ───────────────────────────── */}
            <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>System Health</h2>
                <div className="admin-health-grid">
                    {/* API Status */}
                    <div style={{ background: '#15131f', borderRadius: '20px', padding: '20px 22px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)', flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>API Status</div>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: '#4ade80' }}>Operational</div>
                        </div>
                    </div>

                    {/* Video Moderation Queue */}
                    <div style={{ background: '#15131f', borderRadius: '20px', padding: '20px 22px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: (stats?.pendingVideos ?? 0) > 0 ? '#f59e0b' : '#22c55e', boxShadow: (stats?.pendingVideos ?? 0) > 0 ? '0 0 0 3px rgba(245,158,11,0.2)' : '0 0 0 3px rgba(34,197,94,0.2)', flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Moderation Queue</div>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: (stats?.pendingVideos ?? 0) > 0 ? '#fbbf24' : '#4ade80' }}>
                                {stats?.pendingVideos ?? 0} pending
                            </div>
                        </div>
                    </div>

                    {/* Platform Health */}
                    <div style={{ background: '#15131f', borderRadius: '20px', padding: '20px 22px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)', flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Platform Health</div>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: '#4ade80' }}>99.8%</div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedVideo && (
                <VideoPlayerModal
                    videos={communityVideos}
                    initialIndex={communityVideos.findIndex(v => v.id === selectedVideo.id)}
                    onClose={() => setSelectedVideo(null)}
                    currentUserId={user?.id}
                />
            )}
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';
import VideoPlayerModal from '@/components/shared/VideoPlayerModal';

interface DashStats {
    totalMembers: number;
    totalRevenue: number;
    activeCauses: number;
    totalVotes: number;
    memberSince?: string;
}

interface Campaign {
    id: string;
    name: string;
    progress: number;
    image?: string;
}

interface Activity {
    id: string;
    text: string;
    time: string;
    icon: string;
}

export default function AdminOverviewContent() {
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashStats | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [communityVideos, setCommunityVideos] = useState<any[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
    const [votesRemaining, setVotesRemaining] = useState<number>(0);
    const [votesTotal, setVotesTotal] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const firstName = user?.name?.split(' ')[0] || 'User';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/admin/analytics', { credentials: 'include' });
                const data = await res.json();
                setStats({
                    totalMembers: data.totalMembers ?? 0,
                    totalRevenue: data.totalRevenue ?? 0,
                    activeCauses: data.activeCauses ?? 0,
                    totalVotes: data.totalVotes ?? 0,
                    memberSince: data.memberSince,
                });

                // Map causes to campaign cards
                if (data.recentActivity?.causes) {
                    setCampaigns(
                        data.recentActivity.causes.map((c: { id: string; name: string; raisedAmount: number; goalAmount: number; image?: string }) => ({
                            id: c.id,
                            name: c.name,
                            progress: c.goalAmount > 0 ? Math.round((c.raisedAmount / c.goalAmount) * 100) : 0,
                            image: c.image,
                        }))
                    );
                }

                // Map activity items
                if (data.recentActivity?.latestMembers) {
                    setActivities(
                        data.recentActivity.latestMembers.slice(0, 5).map((m: { id: string; name: string; email: string; createdAt: string }) => ({
                            id: m.id,
                            text: `${m.name} joined the movement`,
                            time: new Date(m.createdAt).toLocaleDateString(),
                            icon: '👤',
                        }))
                    );
                }

                // Fetch community videos
                const videosRes = await fetch('/api/admin/videos', { credentials: 'include' });
                if (videosRes.ok) {
                    const videosData = await videosRes.json();
                    setCommunityVideos(videosData.videos || []);
                }

                // Fetch user vote balance
                const votesRes = await fetch('/api/votes', { credentials: 'include' });
                if (votesRes.ok) {
                    const votesData = await votesRes.json();
                    if (votesData.userVotes !== undefined) {
                        const used = (votesData.userVotes as { count: number }[]).reduce((s: number, v: { count: number }) => s + v.count, 0);
                        const total = data.votesTotal ?? user?.votesTotal ?? 0;
                        setVotesTotal(total);
                        setVotesRemaining(Math.max(0, total - used));
                    }
                }
            } catch {
                setStats({ totalMembers: 0, totalRevenue: 0, activeCauses: 0, totalVotes: 0 });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return <div className={styles.emptyState}>Loading dashboard…</div>;
    }

    const statCards = [
        {
            icon: '📋',
            iconClass: styles.statIconBlue,
            value: votesTotal > 0 ? `${votesRemaining} / ${votesTotal}` : 'No Plan',
            label: 'Votes This Cycle',
            badge: votesTotal > 0 ? `${Math.round((votesRemaining / votesTotal) * 100)}%` : '—',
        },
        {
            icon: '💰',
            iconClass: styles.statIconGreen,
            value: `$${(stats?.totalRevenue ?? 1247.50).toLocaleString()}`,
            label: 'Total Impact',
            badge: '12%',
        },
        {
            icon: '📢',
            iconClass: styles.statIconYellow,
            value: `${stats?.activeCauses ?? 12}`,
            label: 'Campaigns Supported',
            badge: 'Active',
        },
        {
            icon: '🎖️',
            iconClass: styles.statIconPurple,
            value: stats?.memberSince
                ? new Date(stats.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : 'Mar 2024',
            label: 'Member Since',
            badge: 'Premium',
        },
    ];

    return (
        <>
            {/* Greeting */}
            <div className={styles.greeting}>
                <div className={styles.greetingText}>
                    <h1>Hello {firstName} 👋</h1>
                    <p>Let&apos;s do something good today!</p>
                </div>
                <button
                    className={styles.castVoteBtn}
                    onClick={() => router.push('/admin/charities')}
                >
                    Cast Vote
                </button>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                {statCards.map((card, i) => (
                    <div key={i} className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <div className={`${styles.statIconWrap} ${card.iconClass}`}>{card.icon}</div>
                            <span className={styles.statBadge}>{card.badge}</span>
                        </div>
                        <div className={styles.statLabel}>{card.label}</div>
                        <div className={styles.statValue}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* On Going Campaigns */}
            <div className={styles.campaignsSection}>
                <div className={styles.campaignsHeader}>
                    <h2 className={styles.campaignsTitle}>On Going Campaigns</h2>
                </div>

                {communityVideos.length === 0 ? (
                    <div className={styles.emptyState}>No active campaigns right now.</div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                        gap: '24px',
                        marginTop: '20px'
                    }}>
                        {communityVideos.map((video) => (
                            <div 
                                key={video.id} 
                                onClick={() => setSelectedVideo(video)}
                                style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '20px',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                                    border: '1px solid #f1f5f9',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.06)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.02)';
                                }}
                            >
                                {/* Video Thumbnail / Player Overlay */}
                                <div style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: '240px',
                                    backgroundColor: '#090d16',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden'
                                }}>
                                    {video.thumbnailUrl ? (
                                        <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : video.videoUrl ? (
                                        <video 
                                            src={video.videoUrl} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            preload="metadata"
                                            muted
                                            playsInline
                                        />
                                    ) : (
                                        <div style={{ color: '#64748b', fontSize: '14px' }}>No Video Preview</div>
                                    )}

                                    {/* Play Overlay Button */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: 'rgba(9, 13, 22, 0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                            backdropFilter: 'blur(4px)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            transition: 'transform 0.2s'
                                        }}>
                                            <div style={{
                                                width: 0, height: 0,
                                                borderStyle: 'solid',
                                                borderWidth: '6px 0 6px 10px',
                                                borderColor: 'transparent transparent transparent #0f172a',
                                                marginLeft: '3px'
                                            }} />
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        zIndex: 10
                                    }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            backgroundColor: video.status === 'approved' ? '#dcfce7' : video.status === 'pending' ? '#fefce8' : '#fee2e2',
                                            color: video.status === 'approved' ? '#15803d' : video.status === 'pending' ? '#a16207' : '#b91c1c',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                        }}>
                                            {video.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Video Info Body */}
                                <div style={{ padding: '16px' }}>
                                    <h3 style={{
                                        fontSize: '15px',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        margin: '0 0 6px 0',
                                        lineHeight: '1.4',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {video.title}
                                    </h3>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#64748b',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span>By {video.authorName}</span>
                                        <span style={{
                                            fontSize: '10px',
                                            color: '#3b82f6',
                                            backgroundColor: '#eff6ff',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontWeight: 700
                                        }}>
                                            {video.causeTag}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            {activities.length > 0 && (
                <div className={styles.sectionCard}>
                    <h3 className={styles.sectionCardTitle}>Recent Activity</h3>
                    <div className={styles.activityList}>
                        {activities.map((act) => (
                            <div key={act.id} className={styles.activityItem}>
                                <div className={styles.activityIcon}>{act.icon}</div>
                                <div className={styles.activityContent}>
                                    <div className={styles.activityText}>{act.text}</div>
                                    <div className={styles.activityTime}>{act.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Video Player Modal with inline voting */}
            {selectedVideo && (
                <VideoPlayerModal
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                    currentUserId={user?.id}
                    votesRemaining={votesRemaining}
                    votesTotal={votesTotal}
                    onVoteCast={(newRemaining) => setVotesRemaining(newRemaining)}
                />
            )}
        </>
    );
}

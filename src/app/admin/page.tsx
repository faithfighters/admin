'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

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
    const [stats, setStats] = useState<DashStats | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
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
            } catch {
                // Fallback data
                setStats({ totalMembers: 0, totalRevenue: 0, activeCauses: 0, totalVotes: 0 });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className={styles.emptyState}>Loading dashboard…</div>;
    }

    const statCards = [
        {
            icon: '🗳️',
            iconClass: styles.statIconBlue,
            value: `${stats?.totalVotes ?? 0}`,
            label: 'Votes This Cycle',
            badge: `/ ${(stats?.totalVotes ?? 0) + 2}`,
        },
        {
            icon: '💰',
            iconClass: styles.statIconGreen,
            value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`,
            label: 'Total Impact',
            badge: '+12%',
        },
        {
            icon: '📋',
            iconClass: styles.statIconYellow,
            value: `${stats?.activeCauses ?? 0}`,
            label: 'Campaigns Supported',
            badge: 'Active',
        },
        {
            icon: '📅',
            iconClass: styles.statIconPurple,
            value: stats?.memberSince
                ? new Date(stats.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : 'Mar 2024',
            label: 'Member Since',
            badge: `${stats?.totalMembers ?? 0} members`,
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
                <button className={styles.castVoteBtn}>Cast Vote</button>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                {statCards.map((card, i) => (
                    <div key={i} className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <div className={`${styles.statIconWrap} ${card.iconClass}`}>{card.icon}</div>
                            <span className={styles.statBadge}>{card.badge}</span>
                        </div>
                        <div className={styles.statValue}>{card.value}</div>
                        <div className={styles.statLabel}>{card.label}</div>
                    </div>
                ))}
            </div>

            {/* On Going Campaigns */}
            <div className={styles.campaignsSection}>
                <div className={styles.campaignsHeader}>
                    <h2 className={styles.campaignsTitle}>On Going Campaigns</h2>
                    <div className={styles.campaignsNav}>
                        <button className={styles.campaignsNavBtn}>‹</button>
                        <button className={styles.campaignsNavBtn}>›</button>
                    </div>
                </div>

                {campaigns.length === 0 ? (
                    <div className={styles.emptyState}>No active campaigns right now.</div>
                ) : (
                    <div className={styles.campaignsGrid}>
                        {campaigns.slice(0, 4).map((camp) => (
                            <div key={camp.id} className={styles.campaignCard}>
                                <div className={styles.campaignThumb}>
                                    {camp.image ? (
                                        <img src={camp.image} alt={camp.name} />
                                    ) : (
                                        <div className={styles.playBtn}>
                                            <div className={styles.playIcon} />
                                        </div>
                                    )}
                                </div>
                                <div className={styles.campaignBody}>
                                    <div className={styles.campaignName}>{camp.name}</div>
                                    <div className={styles.campaignProgress}>
                                        <div
                                            className={styles.campaignProgressFill}
                                            style={{ width: `${Math.min(camp.progress, 100)}%` }}
                                        />
                                    </div>
                                    <div className={styles.campaignMeta}>
                                        <span className={styles.campaignPercentage}>{camp.progress}%</span>
                                        <span className={styles.fireEmoji}>🔥</span>
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
        </>
    );
}

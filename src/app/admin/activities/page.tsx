'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import styles from '../page.module.css';
import { Activity, UserPlus, Flame, AlertTriangle, Vote, Search, Filter, ShieldCheck } from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'vote' | 'submission' | 'report' | 'signup' | 'moderation';
    title: string;
    description: string;
    user: string;
    timestamp: string;
}

export default function ActivitiesPage() {
    return (
        <ProtectedRoute>
            <ActivitiesContent />
        </ProtectedRoute>
    );
}

function ActivitiesContent() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<string>('all');

    useEffect(() => {
        fetch('/api/admin/activities', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => {
                setActivities(data.activities || []);
            })
            .catch((err) => console.error('[Activities] Fetch error:', err))
            .finally(() => setLoading(false));
    }, []);

    const filteredActivities = activities.filter((act) => {
        const matchesSearch = act.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             act.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             act.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' || act.type === activeTab;
        return matchesSearch && matchesTab;
    });

    const getActivityIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'signup':
                return <UserPlus size={18} color="#3b82f6" />;
            case 'submission':
                return <Flame size={18} color="#ef4444" />;
            case 'report':
                return <AlertTriangle size={18} color="#f59e0b" />;
            case 'vote':
                return <Vote size={18} color="#10b981" />;
            case 'moderation':
                return <ShieldCheck size={18} color="#8b5cf6" />;
            default:
                return <Activity size={18} color="#64748b" />;
        }
    };

    const getActivityBadgeStyle = (type: ActivityItem['type']) => {
        switch (type) {
            case 'signup':
                return { backgroundColor: '#eff6ff', color: '#1d4ed8' };
            case 'submission':
                return { backgroundColor: '#fef2f2', color: '#b91c1c' };
            case 'report':
                return { backgroundColor: '#fffbeb', color: '#b45309' };
            case 'vote':
                return { backgroundColor: '#ecfdf5', color: '#047857' };
            case 'moderation':
                return { backgroundColor: '#f5f3ff', color: '#6d28d9' };
            default:
                return { backgroundColor: '#f8fafc', color: '#475569' };
        }
    };

    const getRelativeTime = (timestampStr: string) => {
        const date = new Date(timestampStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading activity logs...</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity size={28} color="#ef4444" />
                        Your Activity Stream
                    </h1>
                    <p style={{ color: '#64748b' }}>Track your real-time activities, moderation reviews, votes, and uploader histories.</p>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} />
                    </span>
                    <input 
                        type="text" 
                        placeholder="Search logs..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 16px 10px 40px',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '12px',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                        }}
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className={styles.tabs} style={{ marginBottom: '28px' }}>
                <button className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabActive : ''}`} onClick={() => setActiveTab('all')}>All Activities</button>
                <button className={`${styles.tabBtn} ${activeTab === 'moderation' ? styles.tabActive : ''}`} onClick={() => setActiveTab('moderation')}>Moderations</button>
                <button className={`${styles.tabBtn} ${activeTab === 'vote' ? styles.tabActive : ''}`} onClick={() => setActiveTab('vote')}>Votes</button>
                <button className={`${styles.tabBtn} ${activeTab === 'submission' ? styles.tabActive : ''}`} onClick={() => setActiveTab('submission')}>Your Campaigns</button>
            </div>

            {/* Activities Timeline */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '24px',
                padding: '32px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}>
                {filteredActivities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                        No activities matched your filters.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
                        {/* Vertical line through timeline */}
                        <div style={{
                            position: 'absolute',
                            left: '21px',
                            top: '8px',
                            bottom: '8px',
                            width: '2px',
                            backgroundColor: '#f1f5f9',
                            zIndex: 1
                        }} />

                        {filteredActivities.map((act) => (
                            <div 
                                key={act.id} 
                                style={{
                                    display: 'flex',
                                    gap: '20px',
                                    alignItems: 'flex-start',
                                    position: 'relative',
                                    zIndex: 2,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {/* Circle Icon */}
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                    border: '1.5px solid #f1f5f9',
                                    backgroundColor: '#ffffff'
                                }}>
                                    {getActivityIcon(act.type)}
                                </div>

                                {/* Content Details */}
                                <div style={{
                                    flex: 1,
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '16px',
                                    padding: '16px 20px',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{act.title}</span>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                ...getActivityBadgeStyle(act.type)
                                            }}>
                                                {act.type}
                                            </span>
                                        </div>
                                        <p style={{ color: '#475569', fontSize: '13.5px', margin: 0, lineHeight: 1.5 }}>
                                            {act.description}
                                        </p>
                                    </div>

                                    {/* Timestamp */}
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {getRelativeTime(act.timestamp)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

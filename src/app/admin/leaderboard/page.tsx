'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import styles from '../page.module.css';
import { Trophy, CreditCard, Vote, Search, Award } from 'lucide-react';

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    plan?: 'faith_fighter' | 'faith_hero' | 'faith_builder' | string;
    votesTotal: number;
    subscription?: {
        plan: string;
        amount: number;
        status: string;
    } | null;
}

export default function LeaderboardPage() {
    return (
        <ProtectedRoute adminOnly>
            <LeaderboardContent />
        </ProtectedRoute>
    );
}

function LeaderboardContent() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<'donations' | 'votes'>('donations');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch('/api/admin/members', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => {
                setMembers(data.members || []);
            })
            .catch((err) => console.error('[Leaderboard] Fetch error:', err))
            .finally(() => setLoading(false));
    }, []);

    // Get plan display name and amount
    const getMemberDonationAmount = (m: Member): number => {
        if (m.subscription && m.subscription.status === 'active') {
            return m.subscription.amount;
        }
        // Fallback pricing config matching FaithFighters tiers
        if (m.plan === 'faith_fighter') return 100;
        if (m.plan === 'faith_hero') return 50;
        if (m.plan === 'faith_builder') return 25;
        return 0;
    };

    const getPlanBadge = (plan?: string) => {
        switch (plan) {
            case 'faith_fighter':
                return { label: 'Faith Fighter', bg: 'linear-gradient(135deg, #7f1d1d, #dc2626)', color: '#ffffff' };
            case 'faith_hero':
                return { label: 'Faith Hero', bg: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#ffffff' };
            case 'faith_builder':
                return { label: 'Faith Builder', bg: 'linear-gradient(135deg, #4c1d95, #8b5cf6)', color: '#ffffff' };
            default:
                return { label: 'Member', bg: '#f1f5f9', color: '#64748b' };
        }
    };

    // Sort members based on active category
    const sortedMembers = [...members]
        .map(m => ({ ...m, donationAmount: getMemberDonationAmount(m) }))
        .sort((a, b) => {
            if (activeCategory === 'donations') {
                return b.donationAmount - a.donationAmount || b.votesTotal - a.votesTotal;
            } else {
                return b.votesTotal - a.votesTotal || b.donationAmount - a.donationAmount;
            }
        })
        .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const topThree = sortedMembers.slice(0, 3);
    const restMembers = sortedMembers.slice(3);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading leaderboard data...</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Trophy size={28} color="#ef4444" />
                        Community Leaderboard
                    </h1>
                    <p style={{ color: '#64748b' }}>Honoring FaithFighters who drive change through generous donations and active voting.</p>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} />
                    </span>
                    <input 
                        type="text" 
                        placeholder="Search members..." 
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

            {/* Category Selector Tabs */}
            <div className={styles.tabs} style={{ marginBottom: '40px' }}>
                <button 
                    className={`${styles.tabBtn} ${activeCategory === 'donations' ? styles.tabActive : ''}`} 
                    onClick={() => setActiveCategory('donations')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <CreditCard size={16} />
                    Donations Leaderboard
                </button>
                <button 
                    className={`${styles.tabBtn} ${activeCategory === 'votes' ? styles.tabActive : ''}`} 
                    onClick={() => setActiveCategory('votes')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Vote size={16} />
                    Votes Leaderboard
                </button>
            </div>

            {/* Top 3 Podium Cards */}
            {sortedMembers.length > 0 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    gap: '24px',
                    marginBottom: '48px',
                    flexWrap: 'wrap',
                    padding: '24px 0'
                }}>
                    {/* Second Place */}
                    {topThree[1] && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '200px',
                            animation: 'fadeInUp 0.6s ease-out'
                        }}>
                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%',
                                    backgroundColor: '#e2e8f0', border: '3px solid #cbd5e1',
                                    display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '20px', color: '#475569',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.06)'
                                }}>
                                    {getInitials(topThree[1].name)}
                                </div>
                                <span style={{
                                    position: 'absolute', bottom: '-4px', right: '-4px',
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    backgroundColor: '#cbd5e1', color: '#475569', fontWeight: 800, fontSize: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white'
                                }}>2</span>
                            </div>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', textAlign: 'center', marginBottom: '4px' }}>{topThree[1].name}</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: activeCategory === 'donations' ? '#dc2626' : '#10b981' }}>
                                {activeCategory === 'donations' ? `$${topThree[1].donationAmount}/mo` : `${topThree[1].votesTotal} Votes`}
                            </div>
                            <div style={{
                                height: '110px', width: '100%',
                                background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
                                borderRadius: '16px 16px 0 0', marginTop: '16px',
                                border: '1px solid #e2e8f0', borderBottom: 'none'
                            }} />
                        </div>
                    )}

                    {/* First Place */}
                    {topThree[0] && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '220px',
                            transform: 'translateY(-16px)',
                            animation: 'fadeInUp 0.8s ease-out'
                        }}>
                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                {/* Crown */}
                                <div style={{ fontSize: '32px', position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)' }}>👑</div>
                                <div style={{
                                    width: '100px', height: '100px', borderRadius: '50%',
                                    backgroundColor: '#fef3c7', border: '4px solid #fbbf24',
                                    display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '24px', color: '#b45309',
                                    boxShadow: '0 12px 24px rgba(251,191,36,0.15)'
                                }}>
                                    {getInitials(topThree[0].name)}
                                </div>
                                <span style={{
                                    position: 'absolute', bottom: '-4px', right: '-4px',
                                    width: '30px', height: '30px', borderRadius: '50%',
                                    backgroundColor: '#fbbf24', color: '#78350f', fontWeight: 800, fontSize: '14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white'
                                }}>1</span>
                            </div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px', textAlign: 'center', marginBottom: '4px' }}>{topThree[0].name}</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: activeCategory === 'donations' ? '#dc2626' : '#10b981' }}>
                                {activeCategory === 'donations' ? `$${topThree[0].donationAmount}/mo` : `${topThree[0].votesTotal} Votes`}
                            </div>
                            <div style={{
                                height: '140px', width: '100%',
                                background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
                                borderRadius: '16px 16px 0 0', marginTop: '16px',
                                border: '1px solid #fde68a', borderBottom: 'none',
                                boxShadow: '0 8px 24px rgba(251,191,36,0.08)'
                            }} />
                        </div>
                    )}

                    {/* Third Place */}
                    {topThree[2] && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '200px',
                            animation: 'fadeInUp 1s ease-out'
                        }}>
                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%',
                                    backgroundColor: '#ffedd5', border: '3px solid #fdba74',
                                    display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '20px', color: '#c2410c',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.04)'
                                }}>
                                    {getInitials(topThree[2].name)}
                                </div>
                                <span style={{
                                    position: 'absolute', bottom: '-4px', right: '-4px',
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    backgroundColor: '#fdba74', color: '#c2410c', fontWeight: 800, fontSize: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white'
                                }}>3</span>
                            </div>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', textAlign: 'center', marginBottom: '4px' }}>{topThree[2].name}</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: activeCategory === 'donations' ? '#dc2626' : '#10b981' }}>
                                {activeCategory === 'donations' ? `$${topThree[2].donationAmount}/mo` : `${topThree[2].votesTotal} Votes`}
                            </div>
                            <div style={{
                                height: '90px', width: '100%',
                                background: 'linear-gradient(180deg, #ffedd5 0%, #fed7aa 100%)',
                                borderRadius: '16px 16px 0 0', marginTop: '16px',
                                border: '1px solid #fed7aa', borderBottom: 'none'
                            }} />
                        </div>
                    )}
                </div>
            )}

            {/* Detailed Standings Card List */}
            <div style={{
                marginTop: '40px'
            }}>
                <h2 style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '20px'
                }}>
                    Full Standing Rankings
                </h2>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {sortedMembers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                            No standing results found.
                        </div>
                    )}
                    {sortedMembers.map((m, index) => {
                        const badge = getPlanBadge(m.plan);
                        const isTopThree = index < 3;
                        
                        return (
                            <div 
                                key={m.id} 
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: isTopThree ? 'rgba(255, 255, 255, 0.9)' : '#ffffff',
                                    border: isTopThree ? `2.5px solid ${index === 0 ? '#fde68a' : index === 1 ? '#cbd5e1' : '#fed7aa'}` : '1.5px solid #e2e8f0',
                                    borderRadius: '20px',
                                    padding: '16px 28px',
                                    boxShadow: isTopThree ? '0 8px 30px rgba(0, 0, 0, 0.04)' : '0 4px 12px rgba(0, 0, 0, 0.02)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.08)';
                                    if (!isTopThree) e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = isTopThree ? '0 8px 30px rgba(0, 0, 0, 0.04)' : '0 4px 12px rgba(0, 0, 0, 0.02)';
                                    if (!isTopThree) e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                {/* Glow Accent for Top 3 */}
                                {isTopThree && (
                                    <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '6px',
                                        backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#ea580c'
                                    }} />
                                )}

                                {/* Left Side: Rank, Avatar, Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    {/* Rank Badge */}
                                    <div style={{
                                        fontSize: '18px',
                                        fontWeight: 900,
                                        width: '65px',
                                        textAlign: 'left',
                                        color: index === 0 ? '#fbbf24' : index === 1 ? '#64748b' : index === 2 ? '#b45309' : '#94a3b8',
                                        fontFamily: 'monospace'
                                    }}>
                                        {index === 0 ? '🏆 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `#${index + 1}`}
                                    </div>

                                    {/* Glowing Avatar Initials */}
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: index === 0 
                                            ? 'radial-gradient(circle, #fef3c7 0%, #fbbf24 100%)' 
                                            : index === 1 
                                            ? 'radial-gradient(circle, #f1f5f9 0%, #cbd5e1 100%)' 
                                            : index === 2 
                                            ? 'radial-gradient(circle, #ffedd5 0%, #fdba74 100%)' 
                                            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                                        color: index === 0 ? '#78350f' : index === 1 ? '#334155' : index === 2 ? '#7c2d12' : '#64748b',
                                        border: `2px solid ${index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#fdba74' : '#cbd5e1'}`,
                                        fontWeight: 800,
                                        fontSize: '15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: isTopThree ? '0 4px 10px rgba(0, 0, 0, 0.08)' : 'none'
                                    }}>
                                        {getInitials(m.name)}
                                    </div>

                                    {/* Name & Email */}
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {m.name}
                                            {m.role === 'admin' && (
                                                <span style={{ fontSize: '10px', backgroundColor: '#fef2f2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ADMIN</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{m.email}</div>
                                    </div>
                                </div>

                                {/* Plan Tier Badge */}
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                    <span style={{
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        background: badge.bg,
                                        color: badge.color,
                                        boxShadow: m.plan && m.plan !== 'free' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                                    }}>
                                        {badge.label}
                                    </span>
                                </div>

                                {/* Right Side: Gamer-Style Stats Blocks */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    {/* Donations Stat Pill */}
                                    <div style={{
                                        backgroundColor: '#fff5f5',
                                        border: '1px solid #fee2e2',
                                        borderRadius: '14px',
                                        padding: '10px 18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        minWidth: '145px',
                                        justifyContent: 'flex-start',
                                        boxShadow: activeCategory === 'donations' ? '0 4px 12px rgba(239, 68, 68, 0.12)' : 'none',
                                        transform: activeCategory === 'donations' ? 'scale(1.05)' : 'none',
                                        borderColor: activeCategory === 'donations' ? '#fca5a5' : '#fee2e2',
                                        transition: 'all 0.2s'
                                    }}>
                                        <span style={{ fontSize: '16px' }}>💰</span>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Donations</div>
                                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#dc2626' }}>${m.donationAmount}/mo</div>
                                        </div>
                                    </div>

                                    {/* Votes Stat Pill */}
                                    <div style={{
                                        backgroundColor: '#f0fdf4',
                                        border: '1px solid #dcfce7',
                                        borderRadius: '14px',
                                        padding: '10px 18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        minWidth: '145px',
                                        justifyContent: 'flex-start',
                                        boxShadow: activeCategory === 'votes' ? '0 4px 12px rgba(34, 197, 94, 0.12)' : 'none',
                                        transform: activeCategory === 'votes' ? 'scale(1.05)' : 'none',
                                        borderColor: activeCategory === 'votes' ? '#86efac' : '#dcfce7',
                                        transition: 'all 0.2s'
                                    }}>
                                        <span style={{ fontSize: '16px' }}>🔥</span>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Votes Cast</div>
                                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#16a34a' }}>{m.votesTotal} Votes</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

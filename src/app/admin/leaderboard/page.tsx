'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import styles from '../page.module.css';
import { Trophy, CreditCard, Vote, Search, DollarSign, Flame, Medal, TrendingUp } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    plan?: string;
    votesTotal: number;
    votesCast: number;
    subscription?: {
        plan: string;
        amount: number;
        status: string;
    } | null;
}

export default function LeaderboardPage() {
    return (
        <ProtectedRoute>
            <LeaderboardContent />
        </ProtectedRoute>
    );
}

const RANK_COLORS = [
    { bg: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, #fbbf24 100%)', text: '#1a1206', border: '#fbbf24', glow: 'rgba(251,191,36,0.3)', podiumBg: 'linear-gradient(180deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.3) 100%)', podiumBorder: 'rgba(245,158,11,0.4)', accent: '#fbbf24' },
    { bg: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.2) 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.4)', glow: 'rgba(255,255,255,0.15)', podiumBg: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.14) 100%)', podiumBorder: 'rgba(255,255,255,0.16)', accent: 'rgba(255,255,255,0.6)' },
    { bg: 'radial-gradient(circle, rgba(234,88,12,0.3) 0%, #ea580c 100%)', text: '#1a0e06', border: '#ea580c', glow: 'rgba(234,88,12,0.25)', podiumBg: 'linear-gradient(180deg, rgba(234,88,12,0.18) 0%, rgba(234,88,12,0.28) 100%)', podiumBorder: 'rgba(234,88,12,0.35)', accent: '#ea580c' },
];

function LeaderboardContent() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<'donations' | 'votes'>('donations');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch('/api/admin/members', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => setMembers(data.members || []))
            .catch((err) => console.error('[Leaderboard] Fetch error:', err))
            .finally(() => setLoading(false));
    }, []);

    const getMemberDonationAmount = (m: Member): number => {
        if (m.subscription && m.subscription.status === 'active') return m.subscription.amount;
        if (m.plan === 'faith_fighter' || m.plan === 'faith_hero' || m.plan === 'faith_builder') return 30;
        return 0;
    };

    const sortedMembers = [...members]
        .map(m => ({ ...m, donationAmount: getMemberDonationAmount(m) }))
        .sort((a, b) => {
            if (activeCategory === 'donations') return b.donationAmount - a.donationAmount || b.votesCast - a.votesCast;
            return b.votesCast - a.votesCast || b.donationAmount - a.donationAmount;
        })
        .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const topThree = sortedMembers.slice(0, 3);

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    const maxDonation = sortedMembers.length > 0 ? Math.max(...sortedMembers.map(m => m.donationAmount)) || 1 : 1;
    const maxVotes = sortedMembers.length > 0 ? Math.max(...sortedMembers.map(m => m.votesCast)) || 1 : 1;

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading leaderboard data…</div>;

    return (
        <div>
            <style>{`
                .lb-podium-wrap { display: flex; justify-content: center; align-items: flex-end; gap: 16px; flex-wrap: nowrap; }
                .lb-podium-card-1 { display: flex; flex-direction: column; align-items: center; width: 200px; transform: translateY(-20px); flex-shrink: 0; }
                .lb-podium-card-23 { display: flex; flex-direction: column; align-items: center; width: 180px; flex-shrink: 0; }
                .lb-standings-row { display: flex; align-items: center; gap: 16px; }
                .lb-pill { display: flex; align-items: center; gap: 8px; border-radius: 12px; padding: 8px 14px; min-width: 120px; transition: all 0.2s; }
                @media (max-width: 640px) {
                    .lb-podium-wrap { gap: 6px !important; }
                    .lb-podium-card-1 { width: 110px !important; transform: translateY(-10px) !important; }
                    .lb-podium-card-23 { width: 90px !important; }
                    .lb-avatar-1 { width: 72px !important; height: 72px !important; font-size: 18px !important; }
                    .lb-avatar-23 { width: 56px !important; height: 56px !important; font-size: 14px !important; }
                    .lb-name { font-size: 12px !important; }
                    .lb-value { font-size: 13px !important; }
                    .lb-crown { font-size: 20px !important; }
                    .lb-podium-bar-1 { height: 96px !important; }
                    .lb-podium-bar-2 { height: 72px !important; }
                    .lb-podium-bar-3 { height: 56px !important; }
                }
                @media (max-width: 400px) {
                    .lb-podium-wrap { gap: 4px !important; }
                    .lb-podium-card-1 { width: 90px !important; transform: translateY(-8px) !important; }
                    .lb-podium-card-23 { width: 76px !important; }
                    .lb-avatar-1 { width: 58px !important; height: 58px !important; font-size: 15px !important; }
                    .lb-avatar-23 { width: 46px !important; height: 46px !important; font-size: 12px !important; }
                    .lb-name { font-size: 11px !important; }
                    .lb-value { font-size: 11px !important; margin-bottom: 8px !important; }
                    .lb-podium-bar-1 { height: 72px !important; }
                    .lb-podium-bar-2 { height: 56px !important; }
                    .lb-podium-bar-3 { height: 44px !important; }
                }
                @media (max-width: 480px) {
                    .lb-pill-votes { display: none !important; }
                    .lb-pill { min-width: 0 !important; padding: 6px 10px !important; }
                }
            `}</style>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Trophy size={28} color="#F8C38F" />
                        Community Leaderboard
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Honoring FaithFighters who drive change through generous donations and active voting.</p>
                </div>
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <Search size={16} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search members…"
                        value={searchQuery}
                        onChange={(e) => { haptic('light'); setSearchQuery(e.target.value); }}
                        style={{ width: '100%', padding: '10px 16px 10px 40px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', background: 'rgba(255,255,255,0.04)', color: '#ffffff' }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#F8C38F')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                </div>
            </div>

            {/* Category Tabs */}
            <div className={styles.tabs} style={{ marginBottom: '40px' }}>
                <button
                    className={`${styles.tabBtn} ${activeCategory === 'donations' ? styles.tabActive : ''}`}
                    onClick={() => { haptic('selection'); setActiveCategory('donations'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <CreditCard size={16} /> Donations Leaderboard
                </button>
                <button
                    className={`${styles.tabBtn} ${activeCategory === 'votes' ? styles.tabActive : ''}`}
                    onClick={() => { haptic('selection'); setActiveCategory('votes'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Vote size={16} /> Votes Leaderboard
                </button>
            </div>

            {/* Podium — Top 3 */}
            {sortedMembers.length > 0 && (
                <div style={{ backgroundColor: '#15131f', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', padding: '40px 12px 0', marginBottom: '32px', overflow: 'hidden' }}>
                    <div className="lb-podium-wrap">
                        {/* 2nd */}
                        {topThree[1] && (
                            <div className="lb-podium-card-23">
                                <div style={{ position: 'relative', marginBottom: '14px' }}>
                                    <div className="lb-avatar-23" style={{ width: '76px', height: '76px', borderRadius: '50%', background: RANK_COLORS[1].bg, border: `3px solid ${RANK_COLORS[1].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px', color: RANK_COLORS[1].text, boxShadow: `0 8px 20px ${RANK_COLORS[1].glow}` }}>{getInitials(topThree[1].name)}</div>
                                    <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: RANK_COLORS[1].accent, color: '#0b0a12', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #15131f' }}>2</span>
                                </div>
                                <div className="lb-name" style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px', textAlign: 'center', marginBottom: '4px', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topThree[1].name}</div>
                                <div className="lb-value" style={{ fontSize: '15px', fontWeight: 800, color: activeCategory === 'donations' ? '#E7421B' : '#10b981', marginBottom: '16px' }}>
                                    {activeCategory === 'donations' ? `$${topThree[1].donationAmount}/mo` : `${topThree[1].votesCast} Votes`}
                                </div>
                                <div className="lb-podium-bar-2" style={{ height: '100px', width: '100%', background: RANK_COLORS[1].podiumBg, borderRadius: '12px 12px 0 0', border: `1px solid ${RANK_COLORS[1].podiumBorder}`, borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Medal size={24} color={RANK_COLORS[1].accent} strokeWidth={2.5} />
                                </div>
                            </div>
                        )}
                        {/* 1st */}
                        {topThree[0] && (
                            <div className="lb-podium-card-1">
                                <div className="lb-crown" style={{ fontSize: '28px', marginBottom: '8px' }}>👑</div>
                                <div style={{ position: 'relative', marginBottom: '14px' }}>
                                    <div className="lb-avatar-1" style={{ width: '96px', height: '96px', borderRadius: '50%', background: RANK_COLORS[0].bg, border: `4px solid ${RANK_COLORS[0].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '26px', color: RANK_COLORS[0].text, boxShadow: `0 12px 32px ${RANK_COLORS[0].glow}` }}>{getInitials(topThree[0].name)}</div>
                                    <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '30px', height: '30px', borderRadius: '50%', backgroundColor: RANK_COLORS[0].accent, color: '#1a1206', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #15131f' }}>1</span>
                                </div>
                                <div className="lb-name" style={{ fontWeight: 800, color: '#ffffff', fontSize: '15px', textAlign: 'center', marginBottom: '4px', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topThree[0].name}</div>
                                <div className="lb-value" style={{ fontSize: '17px', fontWeight: 800, color: activeCategory === 'donations' ? '#E7421B' : '#10b981', marginBottom: '16px' }}>
                                    {activeCategory === 'donations' ? `$${topThree[0].donationAmount}/mo` : `${topThree[0].votesCast} Votes`}
                                </div>
                                <div className="lb-podium-bar-1" style={{ height: '136px', width: '100%', background: RANK_COLORS[0].podiumBg, borderRadius: '12px 12px 0 0', border: `1px solid ${RANK_COLORS[0].podiumBorder}`, borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trophy size={32} color={RANK_COLORS[0].accent} strokeWidth={2.5} />
                                </div>
                            </div>
                        )}
                        {/* 3rd */}
                        {topThree[2] && (
                            <div className="lb-podium-card-23">
                                <div style={{ position: 'relative', marginBottom: '14px' }}>
                                    <div className="lb-avatar-23" style={{ width: '76px', height: '76px', borderRadius: '50%', background: RANK_COLORS[2].bg, border: `3px solid ${RANK_COLORS[2].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px', color: RANK_COLORS[2].text, boxShadow: `0 8px 20px ${RANK_COLORS[2].glow}` }}>{getInitials(topThree[2].name)}</div>
                                    <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: RANK_COLORS[2].accent, color: '#1a0e06', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #15131f' }}>3</span>
                                </div>
                                <div className="lb-name" style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px', textAlign: 'center', marginBottom: '4px', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topThree[2].name}</div>
                                <div className="lb-value" style={{ fontSize: '15px', fontWeight: 800, color: activeCategory === 'donations' ? '#E7421B' : '#10b981', marginBottom: '16px' }}>
                                    {activeCategory === 'donations' ? `$${topThree[2].donationAmount}/mo` : `${topThree[2].votesCast} Votes`}
                                </div>
                                <div className="lb-podium-bar-3" style={{ height: '76px', width: '100%', background: RANK_COLORS[2].podiumBg, borderRadius: '12px 12px 0 0', border: `1px solid ${RANK_COLORS[2].podiumBorder}`, borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Medal size={22} color={RANK_COLORS[2].accent} strokeWidth={2.5} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Full Standings */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <TrendingUp size={18} color="rgba(255,255,255,0.5)" />
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>Full Standing Rankings</h2>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>({sortedMembers.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sortedMembers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)', backgroundColor: '#15131f', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>No members found.</div>
                    )}
                    {sortedMembers.map((m, index) => {
                        const isTopThree = index < 3;
                        const rc = isTopThree ? RANK_COLORS[index] : null;
                        const progressVal = activeCategory === 'donations'
                            ? (m.donationAmount / maxDonation) * 100
                            : (m.votesCast / maxVotes) * 100;

                        return (
                            <div
                                key={m.id}
                                onClick={() => haptic('selection')}
                                className="lb-standings-row"
                                style={{
                                    backgroundColor: '#15131f',
                                    border: isTopThree ? `2px solid ${rc!.border}` : '1.5px solid rgba(255,255,255,0.08)',
                                    borderRadius: '18px', padding: '14px 20px',
                                    boxShadow: isTopThree ? `0 4px 20px ${rc!.glow}` : '0 2px 8px rgba(0,0,0,0.2)',
                                    transition: 'all 0.2s ease', cursor: 'default',
                                    position: 'relative', overflow: 'hidden'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = isTopThree ? `0 8px 28px ${rc!.glow}` : '0 8px 20px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = isTopThree ? `0 4px 20px ${rc!.glow}` : '0 2px 8px rgba(0,0,0,0.2)';
                                }}
                            >
                                {isTopThree && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px', backgroundColor: rc!.accent, borderRadius: '4px 0 0 4px' }} />}

                                {/* Rank icon */}
                                <div style={{ width: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: isTopThree ? '8px' : '0' }}>
                                    {index === 0 ? <Trophy size={22} color="#fbbf24" strokeWidth={2.5} />
                                    : index === 1 ? <Medal size={22} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
                                    : index === 2 ? <Medal size={22} color="#ea580c" strokeWidth={2.5} />
                                    : <span style={{ fontSize: '15px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>#{index + 1}</span>}
                                </div>

                                {/* Avatar */}
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                                    background: rc ? rc.bg : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
                                    color: rc ? rc.text : 'rgba(255,255,255,0.5)',
                                    border: `2px solid ${rc ? rc.border : 'rgba(255,255,255,0.08)'}`,
                                    fontWeight: 800, fontSize: '14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: rc ? `0 4px 12px ${rc.glow}` : 'none'
                                }}>
                                    {getInitials(m.name)}
                                </div>

                                {/* Name + Email + Progress bar */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                                    <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', maxWidth: '200px' }}>
                                        <div style={{ height: '100%', width: `${progressVal}%`, borderRadius: '4px', background: activeCategory === 'donations' ? 'linear-gradient(90deg, #E7421B, #F8C38F)' : 'linear-gradient(90deg, #16a34a, #4ade80)', transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>

                                {/* Donations pill */}
                                <div className="lb-pill" style={{ backgroundColor: activeCategory === 'donations' ? 'rgba(231,66,27,0.12)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${activeCategory === 'donations' ? 'rgba(231,66,27,0.3)' : 'rgba(255,255,255,0.08)'}`, transform: activeCategory === 'donations' ? 'scale(1.04)' : 'none' }}>
                                    <DollarSign size={14} color={activeCategory === 'donations' ? '#F8C38F' : 'rgba(255,255,255,0.4)'} />
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: activeCategory === 'donations' ? '#F8C38F' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Donations</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: activeCategory === 'donations' ? '#F8C38F' : 'rgba(255,255,255,0.6)' }}>${m.donationAmount}/mo</div>
                                    </div>
                                </div>

                                {/* Votes pill */}
                                <div className="lb-pill lb-pill-votes" style={{ backgroundColor: activeCategory === 'votes' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${activeCategory === 'votes' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`, transform: activeCategory === 'votes' ? 'scale(1.04)' : 'none' }}>
                                    <Flame size={14} color={activeCategory === 'votes' ? '#4ade80' : 'rgba(255,255,255,0.4)'} />
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: activeCategory === 'votes' ? '#4ade80' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Votes Cast</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: activeCategory === 'votes' ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>{m.votesCast}</div>
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

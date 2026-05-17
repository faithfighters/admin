'use client';

import { X, Play, Pause, Volume2, VolumeX, ThumbsUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Video {
    id: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    videoUrl: string;
    authorId?: string;
    authorName: string;
    causeTag: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

interface Cause {
    id: string;
    name: string;
    category: string;
}

interface VideoPlayerModalProps {
    video: Video;
    onClose: () => void;
    currentUserId?: string;
    votesRemaining?: number;
    votesTotal?: number;
    onVoteCast?: (newRemaining: number) => void;
}

export default function VideoPlayerModal({
    video,
    onClose,
    currentUserId,
    votesRemaining = 0,
    votesTotal = 0,
    onVoteCast,
}: VideoPlayerModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [reporting, setReporting] = useState(false);

    // Cause lookup for voting
    const [matchedCause, setMatchedCause] = useState<Cause | null>(null);
    const [causeLoading, setCauseLoading] = useState(true);

    // Voting state
    const [myVotes, setMyVotes] = useState(0);
    const [localRemaining, setLocalRemaining] = useState(votesRemaining);
    const [votingStatus, setVotingStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [voteError, setVoteError] = useState('');

    // Self-vote check — compare string IDs safely
    const isOwnReel = !!currentUserId && !!video.authorId && currentUserId === video.authorId;

    // Prevent background scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    // Sync local remaining when prop changes
    useEffect(() => { setLocalRemaining(votesRemaining); }, [votesRemaining]);

    // Find the active cause matching this video's causeTag.
    // Strategy: first try the active voting-cycle causes; if none, fall back to all active causes.
    useEffect(() => {
        setCauseLoading(true);

        const tag = video.causeTag?.toLowerCase() ?? '';
        const tagWords = tag.split(/\s+/).filter(Boolean);

        const scoreCause = (c: any) => {
            const name = (c.name ?? '').toLowerCase();
            const cat  = (c.category ?? '').toLowerCase();
            if (cat === tag || name === tag) return 100;
            if (tag.includes(cat) || cat.includes(tag)) return 80;
            if (name.includes(tag) || tag.includes(name)) return 70;
            // word-level overlap
            const words = [...name.split(/\s+/), ...cat.split(/\s+/)];
            const overlap = tagWords.filter(w => words.some(cw => cw.includes(w) || w.includes(cw))).length;
            return overlap > 0 ? overlap * 10 : -1;
        };

        const matchCause = (causes: any[]) => {
            if (!causes.length) return null;
            const scored = causes.map(c => ({ c, s: scoreCause(c) })).filter(x => x.s >= 0);
            if (!scored.length) return causes.length === 1 ? causes[0] : null;
            scored.sort((a, b) => b.s - a.s);
            return scored[0].c;
        };

        fetch('/api/votes', { credentials: 'include' })
            .then(r => r.json())
            .then(async data => {
                const cycleCauses: any[] = data.causes ?? [];
                const userVotes: any[] = data.userVotes ?? [];

                let found = matchCause(cycleCauses);

                // ── Fallback: no cycle causes → try all active causes ──
                if (!found) {
                    try {
                        const allRes = await fetch('/api/causes?status=active', { credentials: 'include' });
                        if (allRes.ok) {
                            const allData = await allRes.json();
                            const allCauses: any[] = allData.causes ?? [];
                            found = matchCause(allCauses);
                        }
                    } catch { /* ignore */ }
                }

                setMatchedCause(found ?? null);

                // Pre-fill existing user votes for this cause
                if (found) {
                    const existing = userVotes.find((v: any) => v.causeId === found.id);
                    if (existing) setMyVotes(existing.count);
                }
            })
            .catch(() => setMatchedCause(null))
            .finally(() => setCauseLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video.id]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
        else { videoRef.current.play().catch(() => {}); setIsPlaying(true); }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleReport = async () => {
        const reason = prompt('Enter the reason for reporting this video:', 'Inappropriate content');
        if (reason === null) return;
        setReporting(true);
        try {
            const res = await fetch(`/api/videos/${video.id}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });
            if (res.ok) alert('Thank you! This reel has been flagged for review.');
            else alert('Failed to report this video.');
        } catch { alert('An error occurred while reporting.'); }
        finally { setReporting(false); }
    };

    const castVote = async (change: 1 | -1) => {
        if (!matchedCause) return;
        if (change > 0 && localRemaining < 1) return;
        if (change < 0 && myVotes < 1) return;

        const nextVotes = myVotes + change;
        const nextRemaining = localRemaining - change;

        // Optimistic update
        setMyVotes(nextVotes);
        setLocalRemaining(nextRemaining);
        setVotingStatus('saving');
        setVoteError('');

        try {
            const res = await fetch('/api/votes', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ causeId: matchedCause.id, count: change }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                setMyVotes(myVotes);
                setLocalRemaining(localRemaining);
                setVotingStatus('error');
                setVoteError(errData.message || 'Failed to save vote.');
                setTimeout(() => { setVotingStatus('idle'); setVoteError(''); }, 3000);
            } else {
                setVotingStatus('success');
                onVoteCast?.(nextRemaining);
                setTimeout(() => setVotingStatus('idle'), 1500);
            }
        } catch {
            setMyVotes(myVotes);
            setLocalRemaining(localRemaining);
            setVotingStatus('error');
            setVoteError('Network error. Please try again.');
            setTimeout(() => { setVotingStatus('idle'); setVoteError(''); }, 3000);
        }
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
                backgroundColor: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(16px) saturate(180%)',
                animation: 'vpm_fadeIn 0.25s ease-out',
            }}
            onClick={onClose}
        >
            <style>{`
                @keyframes vpm_fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes vpm_slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>

            <div
                style={{
                    position: 'relative', display: 'flex', flexDirection: 'row',
                    width: '100%', maxWidth: '870px', height: '80vh', maxHeight: '700px',
                    backgroundColor: '#ffffff', borderRadius: '28px', overflow: 'hidden',
                    boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6)',
                    animation: 'vpm_slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    border: '1px solid rgba(255,255,255,0.12)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── LEFT: Video Player ── */}
                <div style={{
                    position: 'relative', flex: '1.25', backgroundColor: '#090d16',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                    <video
                        ref={videoRef}
                        src={video.videoUrl}
                        autoPlay loop playsInline muted={isMuted}
                        onClick={togglePlay}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                    />

                    {/* Bottom controls bar */}
                    <div style={{
                        position: 'absolute', bottom: '20px', left: '20px', right: '20px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10,
                    }}>
                        <button onClick={togglePlay} style={iconBtnStyle}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {isPlaying
                                ? <Pause size={18} fill="currentColor" />
                                : <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />}
                        </button>
                        <button onClick={toggleMute} style={iconBtnStyle}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>
                </div>

                {/* ── RIGHT: Details + Voting ── */}
                <div style={{
                    flex: '1', padding: '28px 24px', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', borderLeft: '1px solid #f1f5f9',
                    backgroundColor: '#ffffff', overflowY: 'auto',
                }}>
                    <div>
                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={statusBadgeStyle(video.status)}>{video.status}</span>
                                <button
                                    onClick={handleReport} disabled={reporting}
                                    style={smallBtnStyle('#fef2f2', '#ef4444')}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                >
                                    🚩 {reporting ? 'Reporting...' : 'Report'}
                                </button>
                            </div>
                            <button onClick={onClose} style={closeBtnStyle}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Title & cause tag */}
                        <h2 style={{ fontSize: '21px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', lineHeight: '1.3' }}>
                            {video.title}
                        </h2>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                            {video.causeTag} Campaign
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
                            {video.description || 'No description provided.'}
                        </p>

                        {/* ── Voting Panel ── */}
                        {causeLoading ? (
                            <div style={votingPanelStyle(false)}>
                                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Loading vote info…</p>
                            </div>
                        ) : isOwnReel ? (
                            /* Self-vote blocked */
                            <div style={votingPanelStyle(true)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <ThumbsUp size={16} color="#94a3b8" />
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8' }}>
                                        Cannot vote on your own reel
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                                    Voting on reels you submitted is not permitted.
                                </p>
                            </div>
                        ) : !matchedCause ? (
                            /* No active cause found */
                            <div style={votingPanelStyle(true)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <ThumbsUp size={16} color="#94a3b8" />
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b' }}>
                                        No active voting cycle
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                                    This reel isn&apos;t linked to an active campaign. Check back when a new cycle opens.
                                </p>
                            </div>
                        ) : (
                            /* ✅ Voting available */
                            <div style={votingPanelStyle(false)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                    <ThumbsUp size={16} color="#dc2626" />
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                        Vote for &ldquo;{matchedCause.name}&rdquo;
                                    </span>
                                </div>

                                {/* +/− controls */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                                    <button
                                        onClick={() => castVote(-1)}
                                        disabled={myVotes < 1 || votingStatus === 'saving'}
                                        style={voteCtrlBtn(myVotes < 1 || votingStatus === 'saving', false)}
                                        onMouseEnter={e => { if (myVotes > 0) e.currentTarget.style.transform = 'scale(1.1)'; }}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >−</button>

                                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                                            {myVotes}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                                            votes cast
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => castVote(1)}
                                        disabled={localRemaining < 1 || votingStatus === 'saving'}
                                        style={voteCtrlBtn(localRemaining < 1 || votingStatus === 'saving', true)}
                                        onMouseEnter={e => { if (localRemaining > 0) e.currentTarget.style.transform = 'scale(1.1)'; }}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >+</button>
                                </div>

                                {/* Status feedback */}
                                {(votingStatus !== 'idle' || voteError) && (
                                    <div style={{
                                        fontSize: '12px', fontWeight: 600, marginBottom: '10px', padding: '8px 12px',
                                        borderRadius: '10px',
                                        backgroundColor: votingStatus === 'success' ? '#f0fdf4' : votingStatus === 'error' ? '#fef2f2' : '#f8fafc',
                                        color: votingStatus === 'success' ? '#16a34a' : votingStatus === 'error' ? '#dc2626' : '#64748b',
                                    }}>
                                        {votingStatus === 'saving' && '⏳ Saving your vote…'}
                                        {votingStatus === 'success' && '✅ Vote recorded!'}
                                        {votingStatus === 'error' && `❌ ${voteError}`}
                                    </div>
                                )}

                                {/* Vote balance */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700 }}>
                                        {localRemaining} of {votesTotal} votes remaining
                                    </span>
                                    {localRemaining === 0 && (
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Upgrade for more votes</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metadata footer */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '18px', marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Submitted By</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{video.authorName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Upload Date</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                {new Date(video.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Style helpers ──────────────────────────────────────────── */
const iconBtnStyle: React.CSSProperties = {
    width: '44px', height: '44px', borderRadius: '50%',
    backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#ffffff', cursor: 'pointer', transition: 'transform 0.2s', backdropFilter: 'blur(8px)',
};

const closeBtnStyle: React.CSSProperties = {
    border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '32px', height: '32px', borderRadius: '50%', transition: 'all 0.2s', flexShrink: 0,
};

function smallBtnStyle(bg: string, color: string): React.CSSProperties {
    return {
        border: 'none', backgroundColor: bg, color, cursor: 'pointer',
        fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px',
        padding: '5px 10px', borderRadius: '10px', transition: 'background 0.2s',
    };
}

function statusBadgeStyle(status: string): React.CSSProperties {
    const map: Record<string, [string, string]> = {
        approved: ['#dcfce7', '#166534'],
        pending: ['#fefce8', '#854d0e'],
        rejected: ['#fee2e2', '#991b1b'],
    };
    const [bg, color] = map[status] ?? ['#f1f5f9', '#475569'];
    return { padding: '5px 11px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize', backgroundColor: bg, color };
}

function votingPanelStyle(muted: boolean): React.CSSProperties {
    return {
        background: muted ? '#f8fafc' : '#fff5f6',
        border: `1.5px solid ${muted ? '#e2e8f0' : '#fecdd3'}`,
        borderRadius: '18px', padding: '18px',
    };
}

function voteCtrlBtn(disabled: boolean, isPrimary: boolean): React.CSSProperties {
    return {
        width: '44px', height: '44px', borderRadius: '50%', border: 'none',
        backgroundColor: disabled ? '#e2e8f0' : isPrimary ? '#dc2626' : '#fff1f2',
        color: disabled ? '#94a3b8' : isPrimary ? '#ffffff' : '#dc2626',
        fontSize: '22px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        transition: 'all 0.2s',
        boxShadow: disabled ? 'none' : isPrimary ? '0 4px 12px rgba(220,38,38,0.3)' : '0 2px 8px rgba(220,38,38,0.12)',
    };
}

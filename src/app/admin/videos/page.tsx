'use client';

import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Video } from '@/lib/types';
import styles from '../page.module.css';
import { Film, CheckCircle, XCircle, Clock, ShieldAlert, Plus, X, Star, Ban, Trash2 } from 'lucide-react';
import VideoPlayerModal from '@/components/shared/VideoPlayerModal';
import { useToast } from '@/components/shared/Toast';

export default function AdminVideosPage() {
    return (
        <ProtectedRoute>
            <VideoModerationSection />
        </ProtectedRoute>
    );
}

function VideoModerationSection() {
    const { toast } = useToast();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'closed' | 'finished'>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Finished campaigns (100% funded, or cycle expired without reaching target)
    const [finishedVideos, setFinishedVideos] = useState<Video[]>([]);
    const [finishedLoading, setFinishedLoading] = useState(false);
    const [finishedSubFilter, setFinishedSubFilter] = useState<'completed' | 'expired'>('completed');

    // Date prompt states for approval
    const [datePromptOpen, setDatePromptOpen] = useState(false);
    const [promptTargetIds, setPromptTargetIds] = useState<string[]>([]);
    const [promptStartDate, setPromptStartDate] = useState('');
    const [promptEndDate, setPromptEndDate] = useState('');

    // Reason prompt state for closing an approved campaign early
    const [closePromptOpen, setClosePromptOpen] = useState(false);
    const [closeTargetId, setCloseTargetId] = useState<string | null>(null);
    const [closeReason, setCloseReason] = useState('');

    // Blocked words state
    const [blockedWords, setBlockedWords] = useState<string[]>([]);
    const [newWord, setNewWord] = useState('');
    const [wordLoading, setWordLoading] = useState(false);
    const wordInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch('/api/admin/videos', { credentials: 'include' })
            .then(r => r.json())
            .then(data => setVideos(data.videos || []))
            .catch(() => {})
            .finally(() => setLoading(false));
        fetch('/api/admin/blocked-words', { credentials: 'include' })
            .then(r => r.json())
            .then(data => setBlockedWords(data.blockedWords || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (filter !== 'finished') return;
        setFinishedLoading(true);
        fetch(`/api/admin/videos/finished?filter=${finishedSubFilter}`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => setFinishedVideos(data.videos || []))
            .catch(() => setFinishedVideos([]))
            .finally(() => setFinishedLoading(false));
    }, [filter, finishedSubFilter]);

    const handleAddWord = async () => {
        const w = newWord.trim().toLowerCase();
        if (!w || wordLoading) return;
        setWordLoading(true);
        try {
            const res = await fetch('/api/admin/blocked-words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ word: w }),
            });
            const data = await res.json();
            if (res.ok) { setBlockedWords(data.blockedWords); setNewWord(''); wordInputRef.current?.focus(); }
        } finally { setWordLoading(false); }
    };

    const handleRemoveWord = async (word: string) => {
        setWordLoading(true);
        try {
            const res = await fetch(`/api/admin/blocked-words/${encodeURIComponent(word)}`, {
                method: 'DELETE', credentials: 'include',
            });
            const data = await res.json();
            if (res.ok) setBlockedWords(data.blockedWords);
        } finally { setWordLoading(false); }
    };

    const handleFeature = async (id: string) => {
        setActionLoading(id + 'feature');
        try {
            const res = await fetch(`/api/admin/videos/${id}/feature`, {
                method: 'PATCH',
                credentials: 'include',
            });
            if (res.ok) {
                setVideos(prev => prev.map(v => ({ ...v, isFeatured: v.id === id })));
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        setActionLoading(id + action);
        try {
            const res = await fetch(`/api/admin/videos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: action }),
            });
            if (res.ok) {
                setVideos(prev => prev.map(v => v.id === id ? { ...v, status: action } : v));
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this video? This removes it from the platform and storage, and deletes its linked assistance request if any — it cannot be undone.')) return;
        setActionLoading(id + 'delete');
        try {
            const res = await fetch(`/api/admin/videos/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                setVideos(prev => prev.filter(v => v.id !== id));
                toast('Video deleted.', 'success');
            } else {
                const data = await res.json().catch(() => ({}));
                toast(data.message || 'Failed to delete video.', 'error');
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleBulkAction = async (action: 'approved' | 'rejected') => {
        if (selectedIds.size === 0) return;
        setActionLoading('bulk-' + action);
        const ids = Array.from(selectedIds);
        await Promise.allSettled(ids.map(id =>
            fetch(`/api/admin/videos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: action }),
            })
        ));
        setVideos(prev => prev.map(v => selectedIds.has(v.id) ? { ...v, status: action } : v));
        setSelectedIds(new Set());
        setActionLoading(null);
        toast(`${ids.length} video${ids.length > 1 ? 's' : ''} ${action}`, 'success');
    };

    const handleConfirmApproval = async () => {
        if (promptTargetIds.length === 0 || !promptStartDate || !promptEndDate) return;
        const startISO = new Date(promptStartDate).toISOString();
        const endISO = new Date(promptEndDate).toISOString();
        
        if (new Date(endISO) <= new Date(startISO)) {
            toast('End date must be after start date.', 'error');
            return;
        }
        
        setActionLoading('approve-confirm');
        try {
            if (promptTargetIds.length === 1) {
                const id = promptTargetIds[0];
                const res = await fetch(`/api/admin/videos/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        status: 'approved',
                        votingCycleStartDate: startISO,
                        votingCycleEndDate: endISO
                    }),
                });
                if (res.ok) {
                    setVideos(prev => prev.map(v => v.id === id ? { 
                        ...v, 
                        status: 'approved',
                        votingCycleStartDate: startISO,
                        votingCycleEndDate: endISO
                    } : v));
                    toast('Video approved successfully.', 'success');
                } else {
                    const errData = await res.json();
                    toast(errData.message || 'Failed to approve video.', 'error');
                }
            } else {
                const ids = promptTargetIds;
                await Promise.allSettled(ids.map(id =>
                    fetch(`/api/admin/videos/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ 
                            status: 'approved',
                            votingCycleStartDate: startISO,
                            votingCycleEndDate: endISO
                        }),
                    })
                ));
                
                setVideos(prev => prev.map(v => ids.includes(v.id) ? { 
                    ...v, 
                    status: 'approved',
                    votingCycleStartDate: startISO,
                    votingCycleEndDate: endISO
                } : v));
                setSelectedIds(new Set());
                toast(`${ids.length} videos approved successfully.`, 'success');
            }
            setDatePromptOpen(false);
            setPromptTargetIds([]);
        } catch (err) {
            toast('An error occurred during approval.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleConfirmClose = async () => {
        if (!closeTargetId || !closeReason.trim()) return;
        setActionLoading(closeTargetId + 'close');
        try {
            const res = await fetch(`/api/admin/videos/${closeTargetId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: 'closed', closureReason: closeReason.trim() }),
            });
            if (res.ok) {
                setVideos(prev => prev.map(v => v.id === closeTargetId ? { ...v, status: 'closed', closureReason: closeReason.trim() } : v));
                toast('Campaign closed.', 'success');
                setClosePromptOpen(false);
                setCloseTargetId(null);
                setCloseReason('');
            } else {
                const errData = await res.json();
                toast(errData.message || 'Failed to close campaign.', 'error');
            }
        } catch {
            toast('An error occurred while closing the campaign.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // A video counts as "finished" the same way the Finished tab does — fully
    // funded, or its voting cycle window has ended — and once finished it
    // should only live under Finished, not still clutter the Approved list.
    const isFinished = (v: Video) => {
        const requiredVotes = v.requiredVotes || 0;
        const voteCount = v.voteCount || 0;
        const isCompleted = requiredVotes > 0 && voteCount >= requiredVotes;
        const cycleEnded = !v.votingCycleEndDate || v.votingCycleEndDate < new Date().toISOString();
        return isCompleted || cycleEnded;
    };

    // Card badges must agree with the counters/tabs above — an approved video
    // whose voting window has closed should read "Finished" everywhere, not
    // stay badged "Approved" while the stat card already excludes it.
    const getDisplayStatus = (v: Video) => (v.status === 'approved' && isFinished(v) ? 'finished' : v.status);

    const filtered = filter === 'all'
        ? videos
        : filter === 'approved'
            ? videos.filter(v => v.status === 'approved' && !isFinished(v))
            : videos.filter(v => v.status === filter);
    const pendingFiltered = filtered.filter(v => v.status === 'pending');
    const pendingCount = videos.filter(v => v.status === 'pending').length;
    const approvedCount = videos.filter(v => v.status === 'approved' && !isFinished(v)).length;
    const rejectedCount = videos.filter(v => v.status === 'rejected').length;
    const closedCount = videos.filter(v => v.status === 'closed').length;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                    Video Submission
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>
                    Review and moderate community reel submissions.
                </p>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[
                    { label: 'Pending Review', count: pendingCount, bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
                    { label: 'Approved', count: approvedCount, bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
                    { label: 'Rejected', count: rejectedCount, bg: 'rgba(231,66,27,0.15)', color: '#F8C38F', border: 'rgba(231,66,27,0.3)' },
                    { label: 'Closed', count: closedCount, bg: 'rgba(148,163,184,0.15)', color: '#cbd5e1', border: 'rgba(148,163,184,0.3)' },
                    { label: 'Total', count: videos.length, bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)', border: 'rgba(255,255,255,0.1)' },
                ].map(s => (
                    <div key={s.label} style={{ padding: '12px 18px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: s.color }}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Blocked Words */}
            <div style={{ background: '#15131f', borderRadius: '20px', padding: '24px', border: '1px solid rgba(231,66,27,0.2)', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <ShieldAlert size={18} color="#F8C38F" />
                        <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>Auto-Reject Blocked Words</h2>
                    </div>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                        Videos whose transcript contains any of these words are automatically rejected.
                    </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: blockedWords.length ? '16px' : '0' }}>
                    {blockedWords.map(w => (
                        <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'rgba(231,66,27,0.15)', border: '1px solid rgba(231,66,27,0.3)', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: '#F8C38F' }}>
                            {w}
                            <button
                                onClick={() => handleRemoveWord(w)}
                                disabled={wordLoading}
                                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#F8C38F', opacity: 0.7 }}
                                aria-label={`Remove ${w}`}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    {blockedWords.length === 0 && (
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No blocked words yet.</span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px', maxWidth: '400px', width: '100%' }}>
                    <input
                        ref={wordInputRef}
                        type="text"
                        value={newWord}
                        onChange={e => setNewWord(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddWord()}
                        placeholder="Add a word…"
                        style={{ flex: 1, padding: '9px 14px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', background: 'rgba(255,255,255,0.04)', color: '#ffffff' }}
                    />
                    <button
                        onClick={handleAddWord}
                        disabled={!newWord.trim() || wordLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: !newWord.trim() || wordLoading ? 'not-allowed' : 'pointer', opacity: !newWord.trim() || wordLoading ? 0.5 : 1, fontFamily: 'inherit' }}
                    >
                        <Plus size={14} /> Add
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div className={styles.tabs} style={{ marginBottom: 0 }}>
                    {(['all', 'pending', 'approved', 'rejected', 'closed', 'finished'] as const).map(f => (
                        <button
                            key={f}
                            className={`${styles.tabBtn} ${filter === f ? styles.tabActive : ''}`}
                            onClick={() => { setFilter(f); setSelectedIds(new Set()); }}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            {f !== 'all' && f !== 'finished' && (
                                <span style={{ marginLeft: '6px', fontSize: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '1px 6px' }}>
                                    {f === 'pending' ? pendingCount : f === 'approved' ? approvedCount : f === 'rejected' ? rejectedCount : closedCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Bulk actions — visible when pending videos exist in current filter */}
                {pendingFiltered.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => {
                                const pendingIds = pendingFiltered.map(v => v.id);
                                const allSelected = pendingIds.every(id => selectedIds.has(id));
                                if (allSelected) {
                                    setSelectedIds(new Set());
                                } else {
                                    setSelectedIds(new Set(pendingIds));
                                }
                            }}
                            style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}
                        >
                            {pendingFiltered.every(v => selectedIds.has(v.id)) ? 'Deselect all' : 'Select all pending'}
                        </button>
                        {selectedIds.size > 0 && (
                            <>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{selectedIds.size} selected</span>
                                <button
                                    onClick={() => {
                                        setPromptTargetIds(Array.from(selectedIds));
                                        const now = new Date();
                                        const tzOffset = now.getTimezoneOffset() * 60000;
                                        const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
                                        const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                                        const localEndISOTime = (new Date(defaultEnd.getTime() - tzOffset)).toISOString().slice(0, 16);
                                        setPromptStartDate(localISOTime);
                                        setPromptEndDate(localEndISOTime);
                                        setDatePromptOpen(true);
                                    }}
                                    disabled={actionLoading?.startsWith('bulk')}
                                    style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <CheckCircle size={13} /> Approve Selected
                                </button>
                                <button
                                    onClick={() => handleBulkAction('rejected')}
                                    disabled={actionLoading?.startsWith('bulk')}
                                    style={{ fontSize: '12px', fontWeight: 700, color: '#F8C38F', background: 'rgba(231,66,27,0.15)', border: '1px solid rgba(231,66,27,0.3)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <XCircle size={13} /> Reject Selected
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {filter === 'finished' ? (
                <FinishedCampaignsSection
                    videos={finishedVideos}
                    loading={finishedLoading}
                    subFilter={finishedSubFilter}
                    onSubFilterChange={setFinishedSubFilter}
                    onSelectVideo={setSelectedVideo}
                />
            ) : loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading submissions…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.emptyState}>No {filter === 'all' ? '' : filter} submissions found.</div>
            ) : (
                <div className={styles.reelGrid}>
                    {filtered.map(video => (
                        <div key={video.id} className={styles.reelCard} style={{ position: 'relative' }}>
                            {/* Checkbox for pending bulk selection */}
                            {video.status === 'pending' && (
                                <div
                                    onClick={e => { e.stopPropagation(); toggleSelect(video.id); }}
                                    style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, width: '20px', height: '20px', borderRadius: '6px', background: selectedIds.has(video.id) ? '#E7421B' : 'rgba(255,255,255,0.85)', border: `2px solid ${selectedIds.has(video.id) ? '#E7421B' : 'rgba(255,255,255,0.6)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                                >
                                    {selectedIds.has(video.id) && <CheckCircle size={12} color="white" fill="white" />}
                                </div>
                            )}
                            {/* Reel thumbnail — 9:16 */}
                            <div
                                className={styles.reelThumb}
                                onClick={() => setSelectedVideo(video)}
                            >
                                {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : video.videoUrl ? (
                                    <video
                                        src={video.videoUrl}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        preload="none"
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <Film size={28} color="rgba(255,255,255,0.4)" />
                                )}

                                {/* Dark gradient overlay */}
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.75) 100%)' }} />

                                {/* Play button */}
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '8px 0 8px 14px', borderColor: 'transparent transparent transparent white', marginLeft: '3px' }} />
                                </div>

                                {/* Status badge — right side; left is for checkbox */}
                                <div style={{ position: 'absolute', top: video.status === 'pending' ? '38px' : '10px', left: '10px' }}>
                                    <StatusBadge status={getDisplayStatus(video)} />
                                </div>

                                {/* Featured badge */}
                                {video.isFeatured && (
                                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(234,179,8,0.3)', color: '#fde047', fontSize: '12px', fontWeight: 700, backdropFilter: 'blur(8px)', border: '1px solid rgba(253,224,71,0.4)' }}>
                                            <Star size={10} fill="#fde047" /> Featured
                                        </span>
                                    </div>
                                )}

                                {/* Bottom info */}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8C38F', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                                        {video.causeTag}
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {video.title}
                                    </div>
                                </div>
                            </div>

                            {/* Card body */}
                            <div className={styles.reelCardBody}>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>By {video.authorName}</span>
                                    {' · '}
                                    {new Date(video.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>

                                {video.status === 'pending' ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => {
                                                setPromptTargetIds([video.id]);
                                                const now = new Date();
                                                const tzOffset = now.getTimezoneOffset() * 60000;
                                                const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
                                                const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                                                const localEndISOTime = (new Date(defaultEnd.getTime() - tzOffset)).toISOString().slice(0, 16);
                                                setPromptStartDate(localISOTime);
                                                setPromptEndDate(localEndISOTime);
                                                setDatePromptOpen(true);
                                            }}
                                            disabled={actionLoading !== null}
                                            className={styles.approveBtn}
                                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', fontWeight: 700, fontSize: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontFamily: 'inherit' }}
                                        >
                                            <CheckCircle size={13} /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(video.id, 'rejected')}
                                            disabled={actionLoading !== null}
                                            className={styles.rejectBtn}
                                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#F8C38F', fontWeight: 700, fontSize: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontFamily: 'inherit' }}
                                        >
                                            <XCircle size={13} /> Reject
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                                            {getDisplayStatus(video) === 'approved' ? <CheckCircle size={13} color="#4ade80" /> : getDisplayStatus(video) === 'finished' ? <CheckCircle size={13} color="#60a5fa" /> : video.status === 'closed' ? <Ban size={13} color="#cbd5e1" /> : <XCircle size={13} color="#F8C38F" />}
                                            {getDisplayStatus(video) === 'approved' ? 'Approved' : getDisplayStatus(video) === 'finished' ? 'Finished' : video.status === 'closed' ? 'Closed' : 'Rejected'}
                                        </div>
                                        {video.status === 'closed' && video.closureReason && (
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                                                &ldquo;{video.closureReason}&rdquo;
                                            </div>
                                        )}
                                        {(video.status === 'closed' || video.status === 'rejected') && (
                                            <button
                                                onClick={() => handleDelete(video.id)}
                                                disabled={actionLoading !== null}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.12)', color: '#fca5a5', fontWeight: 700, fontSize: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading && actionLoading !== video.id + 'delete' ? 0.5 : 1, fontFamily: 'inherit' }}
                                            >
                                                <Trash2 size={12} />
                                                {actionLoading === video.id + 'delete' ? 'Deleting…' : 'Delete Permanently'}
                                            </button>
                                        )}
                                        {video.status === 'approved' && (
                                            <>
                                                <button
                                                    onClick={() => handleFeature(video.id)}
                                                    disabled={actionLoading !== null || video.isFeatured}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', borderRadius: '8px', border: video.isFeatured ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)', background: video.isFeatured ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', color: video.isFeatured ? '#fbbf24' : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '12px', cursor: actionLoading || video.isFeatured ? 'not-allowed' : 'pointer', opacity: actionLoading && actionLoading !== video.id + 'feature' ? 0.5 : 1, fontFamily: 'inherit' }}
                                                >
                                                    <Star size={12} fill={video.isFeatured ? '#fbbf24' : 'none'} />
                                                    {video.isFeatured ? 'Featured' : 'Set as Featured'}
                                                </button>
                                                <button
                                                    onClick={() => { setCloseTargetId(video.id); setCloseReason(''); setClosePromptOpen(true); }}
                                                    disabled={actionLoading !== null}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                                                >
                                                    <Ban size={12} />
                                                    Close Campaign
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedVideo && (() => {
                const modalVideos = filter === 'finished' ? finishedVideos : filtered;
                return (
                    <VideoPlayerModal
                        videos={modalVideos}
                        initialIndex={modalVideos.findIndex(v => v.id === selectedVideo.id)}
                        onClose={() => setSelectedVideo(null)}
                    />
                );
            })()}

                                            {datePromptOpen && (
                                                <div style={{
                                                    position: 'fixed', inset: 0, zIndex: 10000,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                    backdropFilter: 'blur(8px)',
                                                    animation: 'vpm_fade 0.2s ease-out',
                                                    padding: '16px',
                                                }}>
                                                    <style>{`
                                                        @keyframes vpm_fade { from{opacity:0} to{opacity:1} }
                                                        @keyframes vpm_up   { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
                                                        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                                                    `}</style>
                                                    <div style={{
                                                        background: '#15131f',
                                                        borderRadius: '24px',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                                                        width: '100%',
                                                        maxWidth: '440px',
                                                        padding: '24px',
                                                        position: 'relative',
                                                        animation: 'vpm_up 0.3s cubic-bezier(0.16,1,0.3,1)',
                                                    }} onClick={e => e.stopPropagation()}>

                                                        <button
                                                            onClick={() => { setDatePromptOpen(false); setPromptTargetIds([]); }}
                                                            style={{
                                                                position: 'absolute', top: '16px', right: '16px',
                                                                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
                                                                width: '32px', height: '32px', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', color: 'rgba(255,255,255,0.6)'
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                                            <div style={{
                                                                width: '40px', height: '40px', borderRadius: '12px',
                                                                backgroundColor: 'rgba(34,197,94,0.15)', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center', color: '#4ade80'
                                                            }}>
                                                                <CheckCircle size={20} />
                                                            </div>
                                                            <div>
                                                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                                                                    Approve {promptTargetIds.length > 1 ? `${promptTargetIds.length} Videos` : 'Video'}
                                                                </h3>
                                                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                                                                    Set the mandatory voting cycle date range.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '6px' }}>
                                                                    Start Date &amp; Time
                                                                </label>
                                                                <input
                                                                    type="datetime-local"
                                                                    value={promptStartDate}
                                                                    onChange={e => setPromptStartDate(e.target.value)}
                                                                    style={{
                                                                        width: '100%',
                                                                        background: 'rgba(255,255,255,0.04)',
                                                                        border: '1.5px solid rgba(255,255,255,0.08)',
                                                                        borderRadius: '10px',
                                                                        color: '#ffffff',
                                                                        fontSize: '14px',
                                                                        padding: '10px 12px',
                                                                        outline: 'none',
                                                                        fontFamily: 'inherit',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </div>

                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '6px' }}>
                                                                    End Date &amp; Time
                                                                </label>
                                                                <input
                                                                    type="datetime-local"
                                                                    value={promptEndDate}
                                                                    onChange={e => setPromptEndDate(e.target.value)}
                                                                    style={{
                                                                        width: '100%',
                                                                        background: 'rgba(255,255,255,0.04)',
                                                                        border: '1.5px solid rgba(255,255,255,0.08)',
                                                                        borderRadius: '10px',
                                                                        color: '#ffffff',
                                                                        fontSize: '14px',
                                                                        padding: '10px 12px',
                                                                        outline: 'none',
                                                                        fontFamily: 'inherit',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </div>

                                                            {promptStartDate && promptEndDate && new Date(promptEndDate) <= new Date(promptStartDate) && (
                                                                <p style={{ fontSize: '12px', color: '#F8C38F', margin: 0, fontWeight: 500 }}>
                                                                    End date must be strictly after start date.
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button
                                                                onClick={handleConfirmApproval}
                                                                disabled={!promptStartDate || !promptEndDate || new Date(promptEndDate) <= new Date(promptStartDate) || actionLoading !== null}
                                                                style={{
                                                                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                                                                    backgroundColor: (!promptStartDate || !promptEndDate || new Date(promptEndDate) <= new Date(promptStartDate) || actionLoading !== null) ? 'rgba(255,255,255,0.1)' : '#16a34a',
                                                                    color: 'white', fontSize: '14px', fontWeight: 700,
                                                                    cursor: (!promptStartDate || !promptEndDate || new Date(promptEndDate) <= new Date(promptStartDate) || actionLoading !== null) ? 'not-allowed' : 'pointer',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                                    fontFamily: 'inherit'
                                                                }}
                                                            >
                                                                {actionLoading === 'approve-confirm' ? (
                                                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'spin 0.75s linear infinite' }} />
                                                                ) : <CheckCircle size={15} />}
                                                                Confirm Approval
                                                            </button>
                                                            <button
                                                                onClick={() => { setDatePromptOpen(false); setPromptTargetIds([]); }}
                                                                style={{
                                                                    padding: '12px 18px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.08)',
                                                                    backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 600,
                                                                    cursor: 'pointer', fontFamily: 'inherit'
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {closePromptOpen && (
                                                <div style={{
                                                    position: 'fixed', inset: 0, zIndex: 10000,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                    backdropFilter: 'blur(8px)',
                                                    animation: 'vpm_fade 0.2s ease-out',
                                                    padding: '16px',
                                                }}>
                                                    <div style={{
                                                        background: '#15131f',
                                                        borderRadius: '24px',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                                                        width: '100%',
                                                        maxWidth: '440px',
                                                        padding: '24px',
                                                        position: 'relative',
                                                        animation: 'vpm_up 0.3s cubic-bezier(0.16,1,0.3,1)',
                                                    }} onClick={e => e.stopPropagation()}>

                                                        <button
                                                            onClick={() => { setClosePromptOpen(false); setCloseTargetId(null); setCloseReason(''); }}
                                                            style={{
                                                                position: 'absolute', top: '16px', right: '16px',
                                                                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
                                                                width: '32px', height: '32px', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', color: 'rgba(255,255,255,0.6)'
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                                            <div style={{
                                                                width: '40px', height: '40px', borderRadius: '12px',
                                                                backgroundColor: 'rgba(148,163,184,0.15)', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center', color: '#cbd5e1'
                                                            }}>
                                                                <Ban size={20} />
                                                            </div>
                                                            <div>
                                                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                                                                    Close Campaign
                                                                </h3>
                                                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                                                                    Pulls it off the platform before its cycle ends. This cannot be undone.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div style={{ marginBottom: '20px' }}>
                                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '6px' }}>
                                                                Reason for closing
                                                            </label>
                                                            <textarea
                                                                value={closeReason}
                                                                onChange={e => setCloseReason(e.target.value)}
                                                                placeholder="e.g. Underperforming — low engagement after 2 weeks"
                                                                rows={3}
                                                                style={{
                                                                    width: '100%',
                                                                    background: 'rgba(255,255,255,0.04)',
                                                                    border: '1.5px solid rgba(255,255,255,0.08)',
                                                                    borderRadius: '10px',
                                                                    color: '#ffffff',
                                                                    fontSize: '14px',
                                                                    padding: '10px 12px',
                                                                    outline: 'none',
                                                                    fontFamily: 'inherit',
                                                                    boxSizing: 'border-box',
                                                                    resize: 'vertical',
                                                                }}
                                                            />
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button
                                                                onClick={handleConfirmClose}
                                                                disabled={!closeReason.trim() || actionLoading !== null}
                                                                style={{
                                                                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                                                                    backgroundColor: (!closeReason.trim() || actionLoading !== null) ? 'rgba(255,255,255,0.1)' : '#dc2626',
                                                                    color: 'white', fontSize: '14px', fontWeight: 700,
                                                                    cursor: (!closeReason.trim() || actionLoading !== null) ? 'not-allowed' : 'pointer',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                                    fontFamily: 'inherit'
                                                                }}
                                                            >
                                                                {actionLoading === closeTargetId + 'close' ? (
                                                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'spin 0.75s linear infinite' }} />
                                                                ) : <Ban size={15} />}
                                                                Confirm Close
                                                            </button>
                                                            <button
                                                                onClick={() => { setClosePromptOpen(false); setCloseTargetId(null); setCloseReason(''); }}
                                                                style={{
                                                                    padding: '12px 18px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.08)',
                                                                    backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 600,
                                                                    cursor: 'pointer', fontFamily: 'inherit'
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
    );
}

function FinishedCampaignsSection({
    videos,
    loading,
    subFilter,
    onSubFilterChange,
    onSelectVideo,
}: {
    videos: Video[];
    loading: boolean;
    subFilter: 'completed' | 'expired';
    onSubFilterChange: (f: 'completed' | 'expired') => void;
    onSelectVideo: (v: Video) => void;
}) {
    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {([
                    { key: 'completed' as const, label: 'Received 100% Votes' },
                    { key: 'expired' as const, label: 'Time Over, Not Funded' },
                ]).map(opt => (
                    <button
                        key={opt.key}
                        onClick={() => onSubFilterChange(opt.key)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            border: subFilter === opt.key ? '1.5px solid rgba(34,197,94,0.4)' : '1.5px solid rgba(255,255,255,0.08)',
                            background: subFilter === opt.key ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                            color: subFilter === opt.key ? '#4ade80' : 'rgba(255,255,255,0.6)',
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading finished campaigns…</div>
            ) : videos.length === 0 ? (
                <div className={styles.emptyState}>
                    No campaigns {subFilter === 'completed' ? 'have reached 100% votes yet' : 'expired without reaching their target'}.
                </div>
            ) : (
                <div style={{ background: '#15131f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                                {['Title', 'Cause', 'Submitted by', 'Votes', 'Progress', 'Cycle ended', ''].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {videos.map(video => (
                                <tr
                                    key={video.id}
                                    onClick={() => onSelectVideo(video)}
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                                >
                                    <td style={{ padding: '12px 16px', color: '#ffffff', fontWeight: 600, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</td>
                                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)' }}>{video.causeTag}</td>
                                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)' }}>{video.authorName}</td>
                                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.85)' }}>
                                        {video.voteCount ?? 0}{video.requiredVotes ? ` / ${video.requiredVotes}` : ''}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                            background: video.isCompleted ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: video.isCompleted ? '#4ade80' : '#fbbf24',
                                        }}>
                                            {video.percentFunded ?? 0}%
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)' }}>
                                        {video.votingCycleEndDate
                                            ? new Date(video.votingCycleEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                            : 'No date set'}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>View →</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
        pending:  { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', icon: <Clock size={10} /> },
        approved: { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', icon: <CheckCircle size={10} /> },
        rejected: { bg: 'rgba(231,66,27,0.15)', color: '#F8C38F', icon: <XCircle size={10} /> },
        closed:   { bg: 'rgba(148,163,184,0.15)', color: '#cbd5e1', icon: <Ban size={10} /> },
        finished: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', icon: <CheckCircle size={10} /> },
    };
    const { bg, color, icon } = map[status] ?? map.pending;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '20px', background: bg, color, fontSize: '12px', fontWeight: 700, textTransform: 'capitalize', backdropFilter: 'blur(8px)', border: `1px solid ${color}40` }}>
            {icon} {status}
        </span>
    );
}

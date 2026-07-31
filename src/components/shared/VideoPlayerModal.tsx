'use client';

import {
    X, Play, Pause, Volume2, VolumeX,
    ChevronUp, ChevronDown, Shield,
    CheckCircle2, XCircle, Clock, Loader2,
    TrendingUp, DollarSign, User, BarChart2,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Video {
    id: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    videoUrl: string;
    authorId?: string;
    authorName: string;
    causeTag: string;
    status: 'pending' | 'approved' | 'rejected' | 'closed';
    createdAt: string;
    beneficiaryName?: string;
    urgencyReason?: string;
    targetAmount?: number;
    requiredVotes?: number;
    voteCount?: number;
    billPayStatus?: 'pending' | 'paid';
    submitterPhone?: string;
    submitterEmail?: string;
    paymentDestination?: {
        type: 'hospital' | 'utility' | 'rent' | 'other';
        institutionName?: string;
        address?: string;
        phone?: string;
        accountNumber?: string;
    };
    isFeatured?: boolean;
    isReported?: boolean;
    reportCount?: number;
    reportReasons?: string[];
    votingCycleStartDate?: string;
    votingCycleEndDate?: string;
}

interface Cause {
    id: string;
    name: string;
    description: string;
    category: string;
    totalVotes: number;
    goalAmount: number;
    raisedAmount: number;
    submittedByName: string;
    status: string;
}

interface VideoPlayerModalProps {
    videos: Video[];
    initialIndex?: number;
    onClose: () => void;
    currentUserId?: string;
}

export default function VideoPlayerModal({
    videos,
    initialIndex = 0,
    onClose,
}: VideoPlayerModalProps) {
    const [idx, setIdx] = useState(initialIndex);
    const [panelOpen, setPanelOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);
    const [videoLoading, setVideoLoading] = useState(true);

    // Moderation state
    const [currentStatus, setCurrentStatus] = useState<'pending' | 'approved' | 'rejected' | 'closed'>(
        videos[initialIndex]?.status ?? 'pending',
    );
    const [moderating, setModerating] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showApproveForm, setShowApproveForm] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [moderateMsg, setModerateMsg] = useState<{ text: string; ok: boolean } | null>(null);

    // Cause data state
    const [cause, setCause] = useState<Cause | null>(null);
    const [causeLoading, setCauseLoading] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const video = videos[idx];

    // Lock scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Sync status + reset when reel changes
    useEffect(() => {
        if (!video) return;
        setCurrentStatus(video.status);
        setPanelOpen(false);
        setIsPlaying(true);
        setIsLandscape(false);
        setVideoLoading(true);
        setShowRejectForm(false);
        setRejectReason('');
        setShowApproveForm(false);
        setStartDate('');
        setEndDate('');
        setModerateMsg(null);
        setCause(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video?.id]);

    // Fetch cause data when panel opens
    useEffect(() => {
        if (!panelOpen || !video?.causeTag || cause !== null) return;
        setCauseLoading(true);
        const tag = video.causeTag.toLowerCase();
        Promise.all([
            fetch('/api/causes?status=active', { credentials: 'include' }).then(r => r.ok ? r.json() : { causes: [] }),
            fetch('/api/causes?status=pending', { credentials: 'include' }).then(r => r.ok ? r.json() : { causes: [] }),
            fetch('/api/causes?status=funded', { credentials: 'include' }).then(r => r.ok ? r.json() : { causes: [] }),
        ]).then(([a, b, c]) => {
            const all: Cause[] = [...(a.causes ?? []), ...(b.causes ?? []), ...(c.causes ?? [])];
            const match = all.find(ca => ca.category?.toLowerCase() === tag || ca.name?.toLowerCase().includes(tag));
            setCause(match ?? null);
        }).catch(() => setCause(null))
          .finally(() => setCauseLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [panelOpen, video?.id]);

    // Keyboard nav
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { if (panelOpen) setPanelOpen(false); else onClose(); }
            if (e.key === 'ArrowUp') goTo(idx - 1);
            if (e.key === 'ArrowDown') goTo(idx + 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, panelOpen]);

    const goTo = useCallback((newIdx: number) => {
        if (newIdx < 0 || newIdx >= videos.length) return;
        setTransitioning(true);
        setTimeout(() => { setIdx(newIdx); setTransitioning(false); }, 220);
    }, [videos.length]);

    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setIsPlaying(true); }
        else { v.pause(); setIsPlaying(false); }
    };

    const toggleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setIsMuted(v.muted);
    };

    const handleModerate = async (
        newStatus: 'approved' | 'rejected',
        reason?: string,
        vStartDate?: string,
        vEndDate?: string
    ) => {
        if (!video) return;
        setModerating(true);
        setModerateMsg(null);
        try {
            const res = await fetch(`/api/videos/${video.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    status: newStatus,
                    ...(newStatus === 'rejected' && reason ? { rejectionReason: reason } : {}),
                    ...(newStatus === 'approved' ? { votingCycleStartDate: vStartDate, votingCycleEndDate: vEndDate } : {}),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentStatus(newStatus);
                setShowRejectForm(false);
                setRejectReason('');
                setShowApproveForm(false);
                setStartDate('');
                setEndDate('');
                setModerateMsg({
                    text: newStatus === 'approved' ? 'Video approved!' : 'Video rejected.',
                    ok: newStatus === 'approved',
                });
                setTimeout(() => setModerateMsg(null), 3000);
            } else {
                setModerateMsg({ text: data.message || 'Action failed.', ok: false });
                setTimeout(() => setModerateMsg(null), 3000);
            }
        } catch {
            setModerateMsg({ text: 'Network error.', ok: false });
            setTimeout(() => setModerateMsg(null), 3000);
        } finally {
            setModerating(false);
        }
    };

    if (!video) return null;

    const hasPrev = idx > 0;
    const hasNext = idx < videos.length - 1;

    const statusSideBg: Record<string, string> = {
        pending:  'rgba(234,179,8,0.3)',
        approved: 'rgba(22,163,74,0.3)',
        rejected: 'rgba(231,66,27,0.3)',
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.94)',
                animation: 'vpm_fade 0.2s ease-out',
            }}
            onClick={() => { if (panelOpen) setPanelOpen(false); else onClose(); }}
        >
            <style>{`
                @keyframes vpm_fade { from{opacity:0} to{opacity:1} }
                @keyframes vpm_up   { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
                @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @media (max-width:600px) {
                    .vpm-shell { width:100vw !important; height:100dvh !important; border-radius:0 !important; }
                    .vpm-nav   { display:none !important; }
                }
            `}</style>

            {/* Up/Down nav */}
            <div className="vpm-nav" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', marginRight:'16px', zIndex:10 }}>
                <button onClick={e => { e.stopPropagation(); goTo(idx - 1); }} disabled={!hasPrev} style={navBtnStyle(!hasPrev)}>
                    <ChevronUp size={20} />
                </button>
                <span style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.5)' }}>
                    {idx + 1}<span style={{ opacity:0.4 }}> / {videos.length}</span>
                </span>
                <button onClick={e => { e.stopPropagation(); goTo(idx + 1); }} disabled={!hasNext} style={navBtnStyle(!hasNext)}>
                    <ChevronDown size={20} />
                </button>
            </div>

            {/* Reel shell */}
            <div
                className="vpm-shell"
                style={{
                    position: 'relative',
                    width: 'min(390px, 100vw)',
                    height: 'min(calc(390px * 16 / 9), 100dvh)',
                    maxHeight: '100dvh',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    backgroundColor: '#000',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
                    opacity: transitioning ? 0 : 1,
                    transform: transitioning ? 'scale(0.97)' : 'scale(1)',
                    transition: 'opacity 0.22s ease, transform 0.22s ease',
                    animation: 'vpm_up 0.3s cubic-bezier(0.16,1,0.3,1)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Video */}
                <video
                    ref={videoRef}
                    src={video.videoUrl}
                    autoPlay loop playsInline muted={isMuted}
                    onClick={togglePlay}
                    onLoadedMetadata={() => {
                        const v = videoRef.current;
                        if (v?.videoWidth && v.videoHeight) setIsLandscape(v.videoWidth > v.videoHeight);
                    }}
                    onCanPlay={() => setVideoLoading(false)}
                    onWaiting={() => setVideoLoading(true)}
                    onPlaying={() => setVideoLoading(false)}
                    style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit: isLandscape ? 'contain' : 'cover', backgroundColor:'#000', cursor:'pointer' }}
                />

                {/* Video loading spinner */}
                {videoLoading && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:15, pointerEvents:'none' }}>
                        <div style={{ width:'48px', height:'48px', borderRadius:'50%', border:'3px solid rgba(255,255,255,0.15)', borderTopColor:'rgba(255,255,255,0.9)', animation:'spin 0.75s linear infinite' }} />
                    </div>
                )}

                {/* Gradient overlay */}
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 22%, transparent 52%, rgba(0,0,0,0.7) 78%, rgba(0,0,0,0.92) 100%)', pointerEvents:'none' }} />

                {/* Top bar */}
                <div style={{ position:'absolute', top:0, left:0, right:0, padding:'14px 14px 0', display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:20 }}>
                    <StatusBadge status={currentStatus} />
                    <button onClick={onClose} style={{ ...topBtnStyle, padding:'0', width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Right action buttons */}
                <div style={{ position:'absolute', right:'12px', bottom: panelOpen ? '340px' : '115px', display:'flex', flexDirection:'column', gap:'14px', alignItems:'center', zIndex:20, transition:'bottom 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
                    <button onClick={togglePlay} style={sideBtn}>
                        {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginLeft:'2px' }} />}
                    </button>
                    <button onClick={toggleMute} style={sideBtn}>
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    {/* Moderation quick-open — color reflects current status */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                        <button
                            onClick={() => setPanelOpen(p => !p)}
                            style={{ ...sideBtn, backgroundColor: panelOpen ? '#1e40af' : statusSideBg[currentStatus] }}
                        >
                            <Shield size={20} />
                        </button>
                        <span style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.7)', textTransform:'capitalize' }}>
                            {currentStatus}
                        </span>
                    </div>
                </div>

                {/* Bottom info bar */}
                <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 14px 14px', zIndex:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                        <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'linear-gradient(135deg,#1e40af,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800, color:'white', flexShrink:0 }}>
                            {video.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{video.authorName}</div>
                            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{video.causeTag}</div>
                        </div>
                    </div>
                    <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', margin:'0 0 10px', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {video.title}
                    </p>
                    <button
                        onClick={() => setPanelOpen(p => !p)}
                        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'9px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.2)', backgroundColor:'rgba(255,255,255,0.1)', backdropFilter:'blur(12px)', color:'white', fontSize:'12px', fontWeight:700, cursor:'pointer' }}
                    >
                        <Shield size={14} />
                        Details &amp; Review
                    </button>
                </div>

                {/* Slide-up moderation panel */}
                <div style={{
                    position:'absolute', bottom:0, left:0, right:0, zIndex:30,
                    backgroundColor:'rgba(10,16,30,0.97)', backdropFilter:'blur(20px)',
                    borderRadius:'22px 22px 0 0',
                    padding:'0 0 28px',
                    transform: panelOpen ? 'translateY(0)' : 'translateY(100%)',
                    transition:'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
                    maxHeight:'75%', overflowY:'auto',
                }}>
                    {/* Sticky back bar */}
                    <div
                        onClick={() => setPanelOpen(false)}
                        style={{ position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', gap:'10px', padding:'12px 18px', background:'rgba(10,16,30,0.98)', borderBottom:'1px solid rgba(255,255,255,0.07)', cursor:'pointer', borderRadius:'22px 22px 0 0' }}
                    >
                        <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <ChevronDown size={16} color="white" />
                        </div>
                        <span style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>Back to Reel</span>
                    </div>

                    <div style={{ padding:'14px 18px 0' }}>
                        {/* Title */}
                        <h2 style={{ fontSize:'16px', fontWeight:800, color:'#fff', margin:'0 0 3px', lineHeight:1.3 }}>{video.title}</h2>
                        <div style={{ fontSize:'12px', fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>{video.causeTag} Campaign</div>
                        <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)', lineHeight:1.6, marginBottom:'14px', whiteSpace:'pre-wrap' }}>
                            {video.description || 'No description provided.'}
                        </p>

                        {/* ── Combined Campaign & Cause Details ── */}
                        <div style={{ backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.08)', padding:'14px', marginBottom:'14px' }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px', borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:'10px' }}>
                                <div>
                                    <div style={{ fontSize:'13px', fontWeight:800, color:'#fff', marginBottom:'2px' }}>Campaign Details</div>
                                    {!causeLoading && cause ? (
                                        <div style={{ fontSize:'11px', color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                                            Cause: {cause.name} ({cause.category})
                                        </div>
                                    ) : (
                                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                                            Category: {video.causeTag}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {video.billPayStatus && (
                                        <span style={{
                                            padding:'3px 8px',
                                            borderRadius:'6px',
                                            fontSize:'10px',
                                            fontWeight:700,
                                            textTransform:'uppercase',
                                            backgroundColor: video.billPayStatus === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: video.billPayStatus === 'paid' ? '#4ade80' : '#fbbf24',
                                            border: `1px solid ${video.billPayStatus === 'paid' ? '#4ade80' : '#fbbf24'}33`,
                                        }}>
                                            {video.billPayStatus}
                                        </span>
                                    )}
                                    {!causeLoading && cause && (
                                        <span style={{
                                            padding:'3px 8px',
                                            borderRadius:'6px',
                                            fontSize:'10px',
                                            fontWeight:700,
                                            textTransform:'uppercase',
                                            backgroundColor:'rgba(255,255,255,0.08)',
                                            color:'rgba(255,255,255,0.6)',
                                        }}>
                                            Cause: {cause.status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Combined Stats Grid */}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                                {/* Reel specific stats */}
                                <CauseStat
                                    icon={<BarChart2 size={12} />}
                                    label="Reel Votes Cast"
                                    value={video.requiredVotes && video.requiredVotes > 0 ? `${video.voteCount || 0} / ${video.requiredVotes}` : `${video.voteCount || 0}`}
                                    color="#60a5fa"
                                />
                                <CauseStat
                                    icon={<DollarSign size={12} />}
                                    label="Reel Est. Raised"
                                    value={video.targetAmount ? `$${Math.round((video.voteCount || 0) * 0.8)} / $${video.targetAmount}` : `$${Math.round((video.voteCount || 0) * 0.8)}`}
                                    color="#4ade80"
                                />
                                
                                {/* Parent Cause stats (Async loaded) */}
                                {causeLoading && (
                                    <div style={{ gridColumn: 'span 2', display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', borderRadius:'8px', backgroundColor:'rgba(255,255,255,0.02)' }}>
                                        <Loader2 size={12} style={{ animation:'spin 1s linear infinite', color:'rgba(255,255,255,0.4)' }} />
                                        <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)' }}>Loading parent cause metrics…</span>
                                    </div>
                                )}
                                
                                {!causeLoading && cause && (
                                    <>
                                        <CauseStat
                                            icon={<BarChart2 size={12} />}
                                            label="Total Cause Votes"
                                            value={cause.totalVotes.toLocaleString()}
                                            color="#a78bfa"
                                        />
                                        <CauseStat
                                            icon={<TrendingUp size={12} />}
                                            label="Total Cause Raised"
                                            value={`$${cause.raisedAmount.toLocaleString()}`}
                                            color="#fbbf24"
                                        />
                                    </>
                                )}

                                {/* Extra video metadata */}
                                {video.beneficiaryName && (
                                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', fontSize: '11px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Beneficiary:</span>
                                        <span style={{ fontWeight: 700, color: '#fff' }}>{video.beneficiaryName}</span>
                                    </div>
                                )}
                                {video.urgencyReason && (
                                    <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', fontSize: '11px', gap: '4px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Urgency / Reason:</span>
                                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>{video.urgencyReason}</span>
                                    </div>
                                )}
                            </div>

                            {/* Progress bar for the specific Reel Campaign */}
                            {video.requiredVotes && video.requiredVotes > 0 && (
                                <div>
                                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                                        <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)' }}>Reel Voting Progress</span>
                                        <span style={{ fontSize:'11px', fontWeight:700, color:'#4ade80' }}>
                                            {Math.min(100, Math.round(((video.voteCount || 0) / video.requiredVotes) * 100))}%
                                        </span>
                                    </div>
                                    <div style={{ height:'5px', borderRadius:'4px', backgroundColor:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                                        <div style={{
                                            height:'100%',
                                            width:`${Math.min(100, ((video.voteCount || 0) / video.requiredVotes) * 100)}%`,
                                            borderRadius:'4px',
                                            background:'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                            transition:'width 0.4s ease',
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Payment / Submitter Contact Details ── */}
                        {(video.submitterEmail || video.submitterPhone || video.paymentDestination) && (
                            <div style={{ backgroundColor:'rgba(255,255,255,0.02)', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.05)', padding:'12px 14px', marginBottom:'14px', fontSize:'12px', color:'rgba(255,255,255,0.7)' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'6px', fontWeight:700, color:'#fff', marginBottom:'8px', textTransform:'uppercase', fontSize:'10px', letterSpacing:'0.5px' }}>
                                    <Shield size={11} color="#60a5fa" />
                                    Submitter &amp; Payment Details
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                    {video.submitterEmail && (
                                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                                            <span style={{ color:'rgba(255,255,255,0.4)' }}>Contact Email:</span>
                                            <span>{video.submitterEmail}</span>
                                        </div>
                                    )}
                                    {video.submitterPhone && (
                                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                                            <span style={{ color:'rgba(255,255,255,0.4)' }}>Contact Phone:</span>
                                            <span>{video.submitterPhone}</span>
                                        </div>
                                    )}
                                    {video.paymentDestination && (
                                        <>
                                            <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'4px 0' }} />
                                            <div style={{ fontWeight:700, color:'rgba(255,255,255,0.5)', fontSize:'11px', textTransform:'uppercase' }}>
                                                Payout Type: {video.paymentDestination.type}
                                            </div>
                                            {video.paymentDestination.institutionName && (
                                                <div style={{ display:'flex', justifyContent:'space-between' }}>
                                                    <span style={{ color:'rgba(255,255,255,0.4)' }}>Institution:</span>
                                                    <span>{video.paymentDestination.institutionName}</span>
                                                </div>
                                            )}
                                            {video.paymentDestination.accountNumber && (
                                                <div style={{ display:'flex', justifyContent:'space-between' }}>
                                                    <span style={{ color:'rgba(255,255,255,0.4)' }}>Account Number:</span>
                                                    <span>{video.paymentDestination.accountNumber}</span>
                                                </div>
                                            )}
                                            {video.paymentDestination.address && (
                                                <div style={{ display:'flex', justifyContent:'space-between' }}>
                                                    <span style={{ color:'rgba(255,255,255,0.4)' }}>Address:</span>
                                                    <span style={{ textAlign:'right', maxWidth:'180px', wordBreak:'break-all' }}>{video.paymentDestination.address}</span>
                                                </div>
                                            )}
                                            {video.paymentDestination.phone && (
                                                <div style={{ display:'flex', justifyContent:'space-between' }}>
                                                    <span style={{ color:'rgba(255,255,255,0.4)' }}>Phone:</span>
                                                    <span>{video.paymentDestination.phone}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ height:'1px', background:'rgba(255,255,255,0.08)', marginBottom:'14px' }} />

                        {/* ── Moderation section ── */}
                        <div style={{ marginBottom:'14px' }}>
                            <p style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'5px' }}>
                                <Shield size={11} /> Moderation
                            </p>

                            {/* Current status row */}
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                                <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>Status:</span>
                                <StatusBadge status={currentStatus} />
                            </div>

                            {/* Feedback message */}
                            {moderateMsg && (
                                <div style={{ fontSize:'12px', fontWeight:600, padding:'8px 12px', borderRadius:'10px', marginBottom:'10px', backgroundColor: moderateMsg.ok ? 'rgba(22,163,74,0.2)' : 'rgba(231,66,27,0.2)', color: moderateMsg.ok ? '#4ade80' : '#fca5a5', display:'flex', alignItems:'center', gap:'6px' }}>
                                    {moderateMsg.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                                    {moderateMsg.text}
                                </div>
                            )}

                            {/* Reject reason textarea */}
                            {showRejectForm ? (
                                <div style={{ marginBottom:'10px' }}>
                                    <textarea
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        placeholder="Reason for rejection (required)…"
                                        style={{ width:'100%', minHeight:'72px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'10px', color:'#fff', fontSize:'12px', padding:'10px 12px', fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }}
                                    />
                                    <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
                                        <button
                                            onClick={() => handleModerate('rejected', rejectReason)}
                                            disabled={!rejectReason.trim() || moderating}
                                            style={actionBtn('danger', !rejectReason.trim() || moderating)}
                                        >
                                            {moderating ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> : <XCircle size={13} />}
                                            Confirm Reject
                                        </button>
                                        <button
                                            onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                                            style={{ padding:'9px 16px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.15)', backgroundColor:'transparent', color:'rgba(255,255,255,0.6)', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : showApproveForm ? (
                                <div style={{ 
                                    backgroundColor: 'rgba(255,255,255,0.03)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '12px', 
                                    padding: '14px', 
                                    marginBottom: '10px',
                                    animation: 'vpm_fade 0.2s ease-out' 
                                }}>
                                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle2 size={13} /> Set Voting Cycle
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                                                Start Date &amp; Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                style={{ 
                                                    width: '100%', 
                                                    background: 'rgba(255,255,255,0.07)', 
                                                    border: '1px solid rgba(255,255,255,0.15)', 
                                                    borderRadius: '8px', 
                                                    color: '#fff', 
                                                    fontSize: '12px', 
                                                    padding: '8px 10px', 
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                                                End Date &amp; Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                style={{ 
                                                    width: '100%', 
                                                    background: 'rgba(255,255,255,0.07)', 
                                                    border: '1px solid rgba(255,255,255,0.15)', 
                                                    borderRadius: '8px', 
                                                    color: '#fff', 
                                                    fontSize: '12px', 
                                                    padding: '8px 10px', 
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    
                                    {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
                                        <p style={{ fontSize: '11px', color: '#fca5a5', margin: '0 0 10px' }}>
                                            End date must be strictly after the start date.
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleModerate('approved', undefined, new Date(startDate).toISOString(), new Date(endDate).toISOString())}
                                            disabled={!startDate || !endDate || new Date(endDate) <= new Date(startDate) || moderating}
                                            style={actionBtn('approve', !startDate || !endDate || new Date(endDate) <= new Date(startDate) || moderating)}
                                        >
                                            {moderating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={13} />}
                                            Confirm Approve
                                        </button>
                                        <button
                                            onClick={() => { setShowApproveForm(false); setStartDate(''); setEndDate(''); }}
                                            style={{ 
                                                padding: '9px 16px', 
                                                borderRadius: '10px', 
                                                border: '1px solid rgba(255,255,255,0.15)', 
                                                backgroundColor: 'transparent', 
                                                color: 'rgba(255,255,255,0.6)', 
                                                fontSize: '12px', 
                                                fontWeight: 600, 
                                                cursor: 'pointer', 
                                                fontFamily: 'inherit' 
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display:'flex', gap:'8px' }}>
                                    {currentStatus !== 'approved' && (
                                        <button
                                            onClick={() => {
                                                setShowApproveForm(true);
                                                const now = new Date();
                                                const tzOffset = now.getTimezoneOffset() * 60000;
                                                const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
                                                
                                                const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                                                const localEndISOTime = (new Date(defaultEnd.getTime() - tzOffset)).toISOString().slice(0, 16);
                                                
                                                setStartDate(localISOTime);
                                                setEndDate(localEndISOTime);
                                            }}
                                            disabled={moderating}
                                            style={actionBtn('approve', moderating)}
                                        >
                                            <CheckCircle2 size={13} />
                                            Approve
                                        </button>
                                    )}
                                    {currentStatus !== 'rejected' && (
                                        <button
                                            onClick={() => setShowRejectForm(true)}
                                            disabled={moderating}
                                            style={actionBtn('danger', moderating)}
                                        >
                                            <XCircle size={13} />
                                            Reject
                                        </button>
                                    )}
                                    {/* If already approved/rejected, show a re-set-to-pending option */}
                                    {currentStatus !== 'pending' && (
                                        <button
                                            onClick={async () => {
                                                setModerating(true);
                                                try {
                                                    const res = await fetch(`/api/admin/videos/${video.id}`, {
                                                        method: 'PATCH',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        credentials: 'include',
                                                        body: JSON.stringify({ status: 'pending' }),
                                                    });
                                                    if (res.ok) {
                                                        setCurrentStatus('pending');
                                                        setModerateMsg({ text: 'Reset to pending.', ok: true });
                                                        setTimeout(() => setModerateMsg(null), 3000);
                                                    }
                                                } finally { setModerating(false); }
                                            }}
                                            style={{ padding:'10px 14px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.12)', backgroundColor:'transparent', color:'rgba(255,255,255,0.5)', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'4px' }}
                                        >
                                            <Clock size={11} /> Pending
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ height:'1px', background:'rgba(255,255,255,0.08)', margin:'14px 0' }} />

                        {/* Metadata */}
                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                            <div>
                                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)', marginBottom:'2px' }}>Submitted By</div>
                                <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{video.authorName}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)', marginBottom:'2px' }}>Upload Date</div>
                                <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.8)' }}>
                                    {new Date(video.createdAt).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dot indicators */}
            <div className="vpm-nav" style={{ display:'flex', flexDirection:'column', gap:'6px', marginLeft:'16px', alignItems:'center', maxHeight:'240px', overflowY:'auto' }}>
                {videos.map((_, i) => (
                    <button
                        key={i}
                        onClick={e => { e.stopPropagation(); goTo(i); }}
                        style={{ width: i===idx ? '8px' : '6px', height: i===idx ? '24px' : '6px', borderRadius:'4px', border:'none', backgroundColor: i===idx ? '#3b82f6' : 'rgba(255,255,255,0.25)', cursor:'pointer', padding:0, transition:'all 0.25s', flexShrink:0 }}
                    />
                ))}
            </div>
        </div>
    );
}

/* ── Helpers ── */
function CauseStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div style={{ backgroundColor:'rgba(255,255,255,0.05)', borderRadius:'10px', padding:'10px 11px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'4px', color }}>
                {icon}
                <span style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</span>
            </div>
            <div style={{ fontSize:'13px', fontWeight:800, color:'#fff' }}>{value}</div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, [string, string]> = {
        approved: ['rgba(22,163,74,0.25)',   '#4ade80'],
        pending:  ['rgba(234,179,8,0.25)',    '#fde047'],
        rejected: ['rgba(231,66,27,0.25)',    '#fca5a5'],
    };
    const [bg, color] = map[status] ?? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.7)'];
    return (
        <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700, textTransform:'capitalize', backgroundColor:bg, color, backdropFilter:'blur(8px)', border:`1px solid ${color}40` }}>
            {status}
        </span>
    );
}

function actionBtn(variant: 'approve' | 'danger', disabled: boolean): React.CSSProperties {
    const bg = disabled
        ? 'rgba(255,255,255,0.08)'
        : variant === 'approve' ? 'rgba(22,163,74,0.85)' : 'rgba(231,66,27,0.85)';
    return {
        flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
        backgroundColor: bg,
        color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
        fontSize: '12px', fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        transition: 'background 0.15s',
    };
}

const topBtnStyle: React.CSSProperties = {
    border: 'none', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', cursor: 'pointer',
    fontSize: '12px', fontWeight: 700, padding: '5px 10px', borderRadius: '18px', backdropFilter: 'blur(8px)',
};

const sideBtn: React.CSSProperties = {
    width: '44px', height: '44px', borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#ffffff', cursor: 'pointer', transition: 'all 0.2s',
};

function navBtnStyle(disabled: boolean): React.CSSProperties {
    return {
        width: '40px', height: '40px', borderRadius: '50%', border: 'none',
        backgroundColor: disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)',
        color: disabled ? 'rgba(255,255,255,0.2)' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s', backdropFilter: 'blur(8px)',
    };
}

'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Video } from '@/lib/types';
import styles from '../page.module.css';
import { AlertTriangle, ShieldCheck, Trash2, Film, ExternalLink, CheckCircle2 } from 'lucide-react';
import VideoPlayerModal from '@/components/shared/VideoPlayerModal';

export default function ReportedVideosPage() {
    return (
        <ProtectedRoute adminOnly>
            <ReportedContent />
        </ProtectedRoute>
    );
}

function ReportedContent() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [handledCount, setHandledCount] = useState(0);

    const fetchReportedVideos = () => {
        setLoading(true);
        fetch('/api/admin/videos?reported=true', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => {
                // Filter videos that are reported and not rejected
                const reportedVideos = (data.videos || []).filter((v: Video) => v.isReported === true && v.status !== 'rejected');
                setVideos(reportedVideos);
            })
            .catch((err) => console.error('[ReportedVideos] Fetch error:', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchReportedVideos();
    }, []);

    // Dismiss a report: sets isReported=false, reportCount=0, reportReasons=[]
    const handleDismissReport = async (id: string) => {
        setActionLoading(id + 'dismiss');
        try {
            const res = await fetch(`/api/admin/videos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    isReported: false,
                    reportCount: 0,
                    reportReasons: []
                }),
            });
            if (res.ok) {
                setVideos((prev) => prev.filter((v) => v.id !== id));
                setHandledCount(n => n + 1);
            }
        } catch (err) {
            console.error('[ReportedVideos] Dismiss report error:', err);
        } finally {
            setActionLoading(null);
        }
    };

    // Remove video: sets status='rejected', isReported=false
    const handleRemoveVideo = async (id: string) => {
        if (!confirm('Are you sure you want to remove this video from campaigns? This will mark it as rejected.')) return;
        
        setActionLoading(id + 'remove');
        try {
            const res = await fetch(`/api/admin/videos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'rejected',
                    isReported: false
                }),
            });
            if (res.ok) {
                setVideos((prev) => prev.filter((v) => v.id !== id));
                setHandledCount(n => n + 1);
            }
        } catch (err) {
            console.error('[ReportedVideos] Remove video error:', err);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}><p>Loading reported queue...</p></div>;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertTriangle size={28} color="#F8C38F" />
                    Reported Content Moderation
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Review flagged video submissions and take moderation actions to keep the platform safe.</p>
            </div>

            {/* Stats Summary Panel */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <div style={{
                    backgroundColor: '#15131f',
                    padding: '24px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(231,66,27,0.25)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8C38F', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Active Flags</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {videos.length}
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>reels awaiting review</span>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#15131f',
                    padding: '24px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Flags Handled</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#4ade80', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        {handledCount}
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>this session</span>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#15131f',
                    padding: '24px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Safety Status</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px', height: '38px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                        Fully Operational
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <h2 className={styles.tableTitle}>Flagged Videos Queue</h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Flagged Video Reel</th>
                                <th>Author</th>
                                <th style={{ textAlign: 'center' }}>Reports</th>
                                <th>Report Reasons</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {videos.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>
                                        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={36} color="#4ade80" /></div>
                                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '16px', marginBottom: '4px' }}>No reported videos!</div>
                                        <div style={{ fontSize: '14px' }}>The community is safe and all flagged reels have been resolved.</div>
                                    </td>
                                </tr>
                            )}
                            {videos.map((video) => (
                                <tr key={video.id}>
                                    <td>
                                        <div
                                            style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}
                                            onClick={() => setSelectedVideo(video)}
                                            title="Click to play reported video"
                                        >
                                            <div style={{ position: 'relative', width: '40px', height: '60px', backgroundColor: '#0b0a12', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {video.thumbnailUrl ? (
                                                    <img src={video.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : video.videoUrl ? (
                                                    <video
                                                        src={video.videoUrl}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        preload="none"
                                                        muted
                                                        playsInline
                                                    />
                                                ) : (
                                                    <Film size={16} color="white" />
                                                )}
                                                {/* Play icon overlay */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0, left: 0, right: 0, bottom: 0,
                                                    backgroundColor: 'rgba(0,0,0,0.35)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <div style={{
                                                        width: 0, height: 0,
                                                        borderStyle: 'solid',
                                                        borderWidth: '5px 0 5px 8px',
                                                        borderColor: 'transparent transparent transparent white'
                                                    }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {video.title}
                                                    <ExternalLink size={12} color="rgba(255,255,255,0.4)" />
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{video.causeTag}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{video.authorName}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '50px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            backgroundColor: 'rgba(231,66,27,0.15)',
                                            color: '#F8C38F',
                                            border: '1px solid rgba(231,66,27,0.3)'
                                        }}>
                                            {video.reportCount || 1}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '280px' }}>
                                            {(video.reportReasons && video.reportReasons.length > 0) ? (
                                                video.reportReasons.map((reason, idx) => (
                                                    <span
                                                        key={idx}
                                                        style={{
                                                            fontSize: '12px',
                                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                                            color: 'rgba(255,255,255,0.75)',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        {reason}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No reason specified</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className={styles.actionBtn}
                                                style={{
                                                    backgroundColor: 'rgba(34,197,94,0.15)',
                                                    borderColor: 'rgba(34,197,94,0.3)',
                                                    color: '#4ade80',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                onClick={() => handleDismissReport(video.id)}
                                                disabled={actionLoading !== null}
                                            >
                                                <ShieldCheck size={14} />
                                                Dismiss
                                            </button>
                                            <button
                                                className={styles.actionBtn}
                                                style={{
                                                    backgroundColor: 'rgba(231,66,27,0.15)',
                                                    borderColor: 'rgba(231,66,27,0.3)',
                                                    color: '#F8C38F',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                onClick={() => handleRemoveVideo(video.id)}
                                                disabled={actionLoading !== null}
                                            >
                                                <Trash2 size={14} />
                                                Remove Reel
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Video Player Modal */}
            {selectedVideo && (
                <VideoPlayerModal
                    videos={videos}
                    initialIndex={videos.findIndex(v => v.id === selectedVideo.id)}
                    onClose={() => setSelectedVideo(null)}
                />
            )}
        </div>
    );
}

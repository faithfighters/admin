'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import styles from '../page.module.css';
import { Search, Flame, Clock, CheckCircle2, XCircle } from 'lucide-react';
import VideoPlayerModal from '@/components/shared/VideoPlayerModal';
import { useAuth } from '@/context/AuthContext';

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
    voteCount?: number;
    requiredVotes?: number;
}

export default function AllCampaignsPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading campaigns...</div>}>
                <CampaignsContent />
            </Suspense>
        </ProtectedRoute>
    );
}

function CampaignsContent() {
    const { user } = useAuth();
    const isStaff = user?.role === 'admin' || user?.role === 'moderator';
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const searchParams = useSearchParams();
    const playId = searchParams.get('play');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');

    useEffect(() => { setSearchQuery(searchParams.get('q') ?? ''); }, [searchParams]);

    useEffect(() => {
        const endpoint = isStaff ? '/api/admin/videos' : '/api/videos';
        fetch(endpoint, { credentials: 'include' })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                return r.json();
            })
            .then((data) => {
                const fetchedVideos = data.videos || [];
                setVideos(fetchedVideos);
                if (playId) {
                    const videoToPlay = fetchedVideos.find((v: Video) => v.id === playId);
                    if (videoToPlay) setSelectedVideo(videoToPlay);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playId, user?.role]);

    const filteredVideos = videos.filter(v => {
        const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             v.authorName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading campaigns...</div>;

    return (
        <div>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>All Campaigns</h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>Explore and manage all submitted reel campaigns.</p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto', maxWidth: '480px' }}>
                    <div style={{ position: 'relative', flex: '1 1 160px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            className={styles.formInput}
                            style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {isStaff && (
                        <select
                            className={styles.formSelect}
                            style={{ flex: '0 0 auto', minWidth: '130px' }}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    )}
                </div>
            </div>

            {filteredVideos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#15131f', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>No campaigns found matching your criteria.</p>
                </div>
            ) : (
                <div className={styles.campaignsGrid}>
                    {filteredVideos.map((video) => (
                        <motion.div
                            key={video.id}
                            className={styles.campaignCard}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -8 }}
                            onClick={() => setSelectedVideo(video)}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={e => {
                                const vid = e.currentTarget.querySelector('video');
                                if (vid) { vid.play().catch(() => {}); }
                            }}
                            onMouseLeave={e => {
                                const vid = e.currentTarget.querySelector('video');
                                if (vid) { vid.pause(); vid.currentTime = 0; }
                            }}
                        >
                            <div className={styles.campaignThumb}>
                                {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt={video.title} />
                                ) : video.videoUrl ? (
                                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                        <video
                                            src={video.videoUrl}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            preload="metadata"
                                            muted
                                            playsInline
                                            loop
                                        />
                                        <div className={styles.playBtn} style={{ pointerEvents: 'none' }}>
                                            <div className={styles.playIcon} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.playBtn}>
                                        <div className={styles.playIcon} />
                                    </div>
                                )}
                                
                                {isStaff && (
                                    <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                            backgroundColor:
                                                video.status === 'approved' ? 'rgba(34,197,94,0.15)' :
                                                video.status === 'pending'  ? 'rgba(245,158,11,0.15)' : 'rgba(231,66,27,0.15)',
                                            color:
                                                video.status === 'approved' ? '#4ade80' :
                                                video.status === 'pending'  ? '#fbbf24' : '#F8C38F',
                                        }}>
                                            {video.status === 'pending' ? <><Clock size={11} style={{ marginRight: 3 }} />Pending</> : video.status === 'approved' ? <><CheckCircle2 size={11} style={{ marginRight: 3 }} />Approved</> : <><XCircle size={11} style={{ marginRight: 3 }} />Rejected</>}
                                        </span>
                                    </div>
                                )}

                                <div className={styles.campaignBody}>
                                    <div className={styles.campaignName}>{video.title}</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>
                                        By {video.authorName} • {video.causeTag}
                                    </div>
                                    <div className={styles.campaignProgress}>
                                        <div
                                            className={styles.campaignProgressFill}
                                            style={{ width: `${video.requiredVotes && video.requiredVotes > 0 ? Math.min(100, Math.round(((video.voteCount || 0) / video.requiredVotes) * 100)) : 0}%` }}
                                        />
                                    </div>
                                    <div className={styles.campaignMeta} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Flame size={14} color="#F8C38F" />
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                                            {video.voteCount || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {selectedVideo && (
                <VideoPlayerModal
                    videos={filteredVideos}
                    initialIndex={filteredVideos.findIndex(v => v.id === selectedVideo.id)}
                    onClose={() => setSelectedVideo(null)}
                    currentUserId={user?.id}
                />
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import styles from '../page.module.css';
import { Search } from 'lucide-react';
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
}

export default function AllCampaignsPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading campaigns...</div>}>
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [votesRemaining, setVotesRemaining] = useState<number>(0);
    const [votesTotal, setVotesTotal] = useState<number>(0);
    const searchParams = useSearchParams();
    const playId = searchParams.get('play');

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

        // Fetch user vote balance
        fetch('/api/votes', { credentials: 'include' })
            .then(r => r.json())
            .then(votesData => {
                if (Array.isArray(votesData.userVotes)) {
                    const used = (votesData.userVotes as { count: number }[]).reduce((s, v) => s + v.count, 0);
                    const total = user?.votesTotal ?? 0;
                    setVotesTotal(total);
                    setVotesRemaining(Math.max(0, total - used));
                }
            })
            .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playId, user?.role]);

    const filteredVideos = videos.filter(v => {
        const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             v.authorName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading campaigns...</div>;

    return (
        <div>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>All Campaigns</h1>
                    <p style={{ color: '#64748b' }}>Explore and manage all submitted reel campaigns.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            className={styles.formInput}
                            style={{ paddingLeft: '40px', width: '260px' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {isStaff && (
                        <select
                            className={styles.formSelect}
                            style={{ width: '150px' }}
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
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                    <p style={{ color: '#94a3b8', fontSize: '16px' }}>No campaigns found matching your criteria.</p>
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
                        >
                            <div className={styles.campaignThumb}>
                                {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt={video.title} />
                                ) : video.videoUrl ? (
                                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <video 
                                            src={video.videoUrl} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            preload="metadata"
                                            muted
                                            playsInline
                                        />
                                        <div className={styles.playBtn}>
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
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                            backgroundColor:
                                                video.status === 'approved' ? '#dcfce7' :
                                                video.status === 'pending'  ? '#fef9c3' : '#fee2e2',
                                            color:
                                                video.status === 'approved' ? '#15803d' :
                                                video.status === 'pending'  ? '#92400e' : '#b91c1c',
                                        }}>
                                            {video.status === 'pending' ? '⏳ Pending' : video.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
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
                                            style={{ width: '0%' }} // Placeholder for progress if needed
                                        />
                                    </div>
                                    <div className={styles.campaignMeta}>
                                        <span className={styles.fireEmoji}>🔥</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

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
        </div>
    );
}

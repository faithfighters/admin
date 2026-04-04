'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Video } from '@/lib/types';
import styles from '../page.module.css';

export default function AdminVideosPage() {
    return (
        <ProtectedRoute adminOnly>
            <VideoModerationContent />
        </ProtectedRoute>
    );
}

function VideoModerationContent() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/videos', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => setVideos(data.videos || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

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
                setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, status: action } : v)));
            }
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div><p>Loading videos...</p></div>;

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h1 className="heading-md">Video Moderation</h1>
                <p className="text-body">Review and approve community video submissions.</p>
            </div>

            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <h2 className={styles.tableTitle}>Submission Queue</h2>
                    <span className={styles.statusBadge} style={{ background: '#f3f4f6', color: '#374151' }}>
                        {videos.filter((v) => v.status === 'pending').length} Pending
                    </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Video Title</th>
                                <th>Author</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {videos.length === 0 && (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No videos found.</td></tr>
                            )}
                            {videos.map((video) => (
                                <tr key={video.id}>
                                    <td>
                                        <strong>{video.title}</strong>
                                        <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                                            {video.causeTag}
                                        </div>
                                    </td>
                                    <td>{video.authorName}</td>
                                    <td>{new Date(video.submittedAt).toLocaleDateString()}</td>
                                    <td>
                                        <span
                                            className={`${styles.statusBadge} ${video.status === 'pending' ? styles.statusPending : video.status === 'approved' ? styles.statusApproved : ''}`}
                                            style={video.status === 'rejected' ? { background: '#fee2e2', color: '#991b1b' } : {}}
                                        >
                                            {video.status}
                                        </span>
                                    </td>
                                    <td>
                                        {video.status === 'pending' && (
                                            <>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.approveBtn}`}
                                                    onClick={() => handleAction(video.id, 'approved')}
                                                    disabled={actionLoading !== null}
                                                >
                                                    {actionLoading === video.id + 'approved' ? '...' : 'Approve'}
                                                </button>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                                    onClick={() => handleAction(video.id, 'rejected')}
                                                    disabled={actionLoading !== null}
                                                >
                                                    {actionLoading === video.id + 'rejected' ? '...' : 'Reject'}
                                                </button>
                                            </>
                                        )}
                                        {video.status !== 'pending' && (
                                            <span style={{ fontSize: '12px', color: 'var(--color-gray-300)' }}>Processed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

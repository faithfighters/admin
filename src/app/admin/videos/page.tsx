'use client';

import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Video } from '@/lib/types';
import styles from '../page.module.css';
import { Upload, Film, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminVideosPage() {
    return (
        <ProtectedRoute adminOnly>
            <VideoContent />
        </ProtectedRoute>
    );
}

function VideoContent() {
    const [activeTab, setActiveTab] = useState<'moderate' | 'upload'>('upload');
    
    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Video Management</h1>
                <p style={{ color: '#64748b' }}>Upload new reels or moderate community submissions.</p>
            </div>

            <div className={styles.tabs}>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('upload')}
                >
                    Upload Reels
                </button>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'moderate' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('moderate')}
                >
                    Moderation Queue
                </button>
            </div>

            {activeTab === 'upload' ? <VideoUploadSection /> : <VideoModerationSection />}
        </div>
    );
}

function VideoUploadSection() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [causeTag, setCauseTag] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title || !causeTag) {
            setMessage({ type: 'error', text: 'Please fill in all required fields and select a video.' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            console.log('[VideoUpload] Starting upload process for:', file.name);
            const contentType = file.type || 'video/mp4';
            
            // 1. Get presigned URL
            let presignRes;
            try {
                presignRes = await fetch('/api/upload/presign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        contentType: contentType,
                        fileSizeBytes: file.size,
                        folder: 'videos'
                    }),
                });
            } catch (fetchErr) {
                console.error('[VideoUpload] Fetch to presign failed:', fetchErr);
                throw new Error('Could not reach the backend server to get upload permission. Please check if the backend is running.');
            }

            if (!presignRes.ok) {
                const errData = await presignRes.json().catch(() => ({ message: 'Unknown server error' }));
                console.error('[VideoUpload] Presign failed:', errData);
                throw new Error(errData.message || 'Failed to get upload URL from server');
            }
            
            const { uploadUrl, publicUrl } = await presignRes.json();
            console.log('[VideoUpload] Got presigned URL, uploading to S3...');

            // 2. Upload to S3
            let uploadRes;
            try {
                uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': contentType },
                });
            } catch (uploadErr) {
                console.error('[VideoUpload] R2/S3 upload failed:', uploadErr);
                throw new Error('Network Error: Failed to upload to storage. This is likely a CORS issue with your Cloudflare R2 bucket. Ensure it allows PUT requests from this origin.');
            }

            if (!uploadRes.ok) {
                console.error('[VideoUpload] S3 upload failed:', uploadRes.status, uploadRes.statusText);
                throw new Error(`Storage upload failed with status ${uploadRes.status}: ${uploadRes.statusText}`);
            }
            console.log('[VideoUpload] S3 upload successful, submitting record...');

            // 3. Submit video record
            let submitRes;
            try {
                submitRes = await fetch('/api/videos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        title,
                        description,
                        videoUrl: publicUrl,
                        causeTag,
                    }),
                });
            } catch (submitErr) {
                console.error('[VideoUpload] Record submission failed:', submitErr);
                throw new Error('Video uploaded successfully, but failed to save the record in the database. Please try again or contact support.');
            }

            if (!submitRes.ok) {
                const errData = await submitRes.json().catch(() => ({ message: 'Unknown server error' }));
                console.error('[VideoUpload] Record submission failed:', errData);
                throw new Error(errData.message || 'Failed to save video record after upload');
            }

            console.log('[VideoUpload] Process complete!');
            setMessage({ type: 'success', text: 'Video uploaded and submitted successfully!' });
            setTitle('');
            setDescription('');
            setCauseTag('');
            setFile(null);
        } catch (err: any) {
            console.error('[VideoUpload] Process failed:', err);
            setMessage({ type: 'error', text: err.message || 'An unexpected error occurred during upload.' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.uploadForm}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Submit a New Reel</h2>
            
            {message && (
                <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    marginBottom: '20px',
                    backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                    fontSize: '14px',
                    fontWeight: 500
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Video Reel (MP4, MOV)</label>
                    <div className={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
                        <span className={styles.dropzoneIcon}>📁</span>
                        <p className={styles.dropzoneText}>
                            {file ? `Selected: ${file.name}` : 'Click to select or drag and drop your video'}
                        </p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            accept="video/*" 
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Title *</label>
                    <input 
                        type="text" 
                        className={styles.formInput} 
                        placeholder="Enter a catchy title" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Description</label>
                    <textarea 
                        className={styles.formTextarea} 
                        placeholder="Tell the story behind this video"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Campaign / Category *</label>
                    <select 
                        className={styles.formSelect}
                        value={causeTag}
                        onChange={(e) => setCauseTag(e.target.value)}
                        required
                    >
                        <option value="">Select a campaign</option>
                        <option value="medical">Medical Relief</option>
                        <option value="education">Education</option>
                        <option value="disaster">Disaster Response</option>
                        <option value="poverty">Poverty Alleviation</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Submit Reel'}
                </button>
            </form>
        </div>
    );
}

function VideoModerationSection() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/videos/admin/all', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => setVideos(data.videos || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        setActionLoading(id + action);
        try {
            const res = await fetch(`/api/videos/${id}`, {
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

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><p>Loading queue...</p></div>;

    return (
        <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
                <h2 className={styles.tableTitle}>Moderation Queue</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className={styles.statusBadge} style={{ background: '#fefce8', color: '#854d0e' }}>
                        {videos.filter((v) => v.status === 'pending').length} Pending
                    </span>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Video Reel</th>
                            <th>Author</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {videos.length === 0 && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>No submissions found.</td></tr>
                        )}
                        {videos.map((video) => (
                            <tr key={video.id}>
                                <td>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: '40px', height: '60px', backgroundColor: '#0f172a', borderRadius: '6px', overflow: 'hidden' }}>
                                            {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Film size={16} color="white" /></div>}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{video.title}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{video.causeTag}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{video.authorName}</td>
                                <td>{new Date(video.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${video.status === 'pending' ? styles.statusPending : video.status === 'approved' ? styles.statusApproved : styles.statusRejected}`}>
                                        {video.status}
                                    </span>
                                </td>
                                <td>
                                    {video.status === 'pending' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className={`${styles.actionBtn} ${styles.approveBtn}`}
                                                onClick={() => handleAction(video.id, 'approved')}
                                                disabled={actionLoading !== null}
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                                onClick={() => handleAction(video.id, 'rejected')}
                                                disabled={actionLoading !== null}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Processed</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

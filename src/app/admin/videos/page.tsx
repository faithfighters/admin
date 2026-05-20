'use client';

import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Video } from '@/lib/types';
import styles from '../page.module.css';
import { Upload, Film, CheckCircle, XCircle, Clock } from 'lucide-react';
import VideoPlayerModal from '@/components/shared/VideoPlayerModal';
import { useAuth } from '@/context/AuthContext';

export default function AdminVideosPage() {
    return (
        <ProtectedRoute>
            <VideoContent />
        </ProtectedRoute>
    );
}

function VideoContent() {
    const { user } = useAuth();
    const isStaff = user?.role === 'admin' || user?.role === 'moderator';
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
                {isStaff && (
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'moderate' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('moderate')}
                    >
                        Moderation Queue
                    </button>
                )}
            </div>

            {activeTab === 'upload' || !isStaff ? <VideoUploadSection /> : <VideoModerationSection />}
        </div>
    );
}

function VideoUploadSection() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Video fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Cause fields (created inline)
    const [causeName, setCauseName] = useState('');
    const [causeCategory, setCauseCategory] = useState('');
    const [causeGoal, setCauseGoal] = useState('');

    // Voting cycle fields (created/updated inline)
    const [cycleName, setCycleName] = useState('');
    const [cycleStart, setCycleStart] = useState('');
    const [cycleEnd, setCycleEnd] = useState('');

    // State
    const [uploading, setUploading] = useState(false);
    const [step, setStep] = useState('');   // progress text
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Existing active cycle info (for display)
    const [activeCycle, setActiveCycle] = useState<{ id: string; name: string } | null>(null);
    const [activeCauses, setActiveCauses] = useState<{ id: string; name: string; category: string }[]>([]);
    const [selectedExistingCauseId, setSelectedExistingCauseId] = useState('');
    const [causeMode, setCauseMode] = useState<'existing' | 'new'>('new');
    const [infoLoading, setInfoLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/cycles', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/causes?status=active', { credentials: 'include' }).then(r => r.json()),
        ])
            .then(([cycleData, causeData]) => {
                const active = (cycleData.cycles ?? []).find((c: any) => c.status === 'active');
                setActiveCycle(active ? { id: active.id, name: active.name } : null);
                const causes = causeData.causes ?? [];
                setActiveCauses(causes);
                if (causes.length > 0) setCauseMode('existing');
            })
            .catch(() => {})
            .finally(() => setInfoLoading(false));
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) {
            setMessage({ type: 'error', text: 'Video file and title are required.' });
            return;
        }
        if (causeMode === 'new' && (!causeName || !causeCategory || !causeGoal)) {
            setMessage({ type: 'error', text: 'Please fill in all cause fields.' });
            return;
        }
        if (causeMode === 'existing' && !selectedExistingCauseId) {
            setMessage({ type: 'error', text: 'Please select an existing cause.' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            // ── Step 1: Upload video to R2/S3 ──
            setStep('Uploading video…');
            const contentType = file.type || 'video/mp4';
            const presignRes = await fetch('/api/upload/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ contentType, fileSizeBytes: file.size, folder: 'videos' }),
            });
            if (!presignRes.ok) throw new Error('Failed to get upload URL.');
            const { uploadUrl, publicUrl } = await presignRes.json();

            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT', body: file,
                headers: { 'Content-Type': contentType },
            });
            if (!uploadRes.ok) throw new Error(`Storage upload failed (${uploadRes.status}).`);

            // ── Step 2: Resolve or create cause ──
            setStep('Setting up cause…');
            let causeId: string;
            let causeTag: string;

            if (causeMode === 'existing') {
                causeId = selectedExistingCauseId;
                const found = activeCauses.find(c => c.id === selectedExistingCauseId);
                causeTag = found?.category || found?.name || causeId;
            } else {
                // Create a new cause
                const causeRes = await fetch('/api/causes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: causeName,
                        description: description || causeName,
                        category: causeCategory,
                        goalAmount: Number(causeGoal),
                    }),
                });
                if (!causeRes.ok) {
                    const err = await causeRes.json().catch(() => ({}));
                    throw new Error(err.message || 'Failed to create cause.');
                }
                const causeData = await causeRes.json();
                causeId = causeData.cause?.id ?? causeData.cause?._id?.toString();
                causeTag = causeCategory;

                // Approve the cause immediately (admin bypass)
                await fetch(`/api/causes/${causeId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ status: 'active' }),
                }).catch(() => {});
            }

            // ── Step 3: Save the video record ──
            setStep('Saving video record…');
            const submitRes = await fetch('/api/videos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title, description, videoUrl: publicUrl, causeTag }),
            });
            if (!submitRes.ok) {
                const err = await submitRes.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to save video record.');
            }

            // ── Step 4: Create or update voting cycle ──
            setStep('Setting up voting cycle…');
            let cycleId = activeCycle?.id ?? null;

            if (!cycleId && cycleName && cycleStart && cycleEnd) {
                // Create a brand-new active cycle with this cause
                const cycleRes = await fetch('/api/admin/cycles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: cycleName,
                        startDate: cycleStart,
                        endDate: cycleEnd,
                        causes: [causeId],
                    }),
                });
                if (cycleRes.ok) {
                    const cd = await cycleRes.json();
                    cycleId = cd.cycle?.id;
                    setActiveCycle({ id: cycleId!, name: cycleName });
                }
            } else if (cycleId) {
                // Add cause to existing cycle if not already there
                const cycleInfoRes = await fetch(`/api/admin/cycles/${cycleId}`, { credentials: 'include' }).then(r => r.json());
                const cycle = cycleInfoRes.cycle ?? cycleInfoRes;
                const existingIds: string[] = (cycle.causes ?? []).map((c: any) =>
                    typeof c === 'string' ? c : c.id ?? c._id?.toString()
                );
                if (!existingIds.includes(causeId)) {
                    await fetch(`/api/admin/cycles/${cycleId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ causes: [...existingIds, causeId] }),
                    });
                }
            }

            setMessage({
                type: 'success',
                text: '✅ Video submitted, cause set up, and voting cycle linked! Members can now cast votes.',
            });
            setTitle(''); setDescription(''); setFile(null);
            setCauseName(''); setCauseCategory(''); setCauseGoal('');
            setCycleName(''); setCycleStart(''); setCycleEnd('');
            setSelectedExistingCauseId('');

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
        } finally {
            setUploading(false);
            setStep('');
        }
    };

    if (infoLoading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>Loading…</div>;

    return (
        <div className={styles.uploadForm}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Submit a New Reel</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                Fill in the video details, link it to a voting cause, and set up a cycle — all in one step.
            </p>

            {message && (
                <div style={{
                    padding: '12px 16px', borderRadius: '12px', marginBottom: '20px',
                    background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    color: message.type === 'success' ? '#166534' : '#dc2626',
                    fontSize: '14px', fontWeight: 600,
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* ─── SECTION 1: Video ─── */}
                <div style={sectionStyle}>
                    <div style={sectionHeader}>📹 Video Details</div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Video File (MP4, MOV)</label>
                        <div className={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
                            <span className={styles.dropzoneIcon}>📁</span>
                            <p className={styles.dropzoneText}>
                                {file ? `✅ ${file.name}` : 'Click to select or drag and drop your video'}
                            </p>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="video/*" onChange={handleFileChange} />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Title *</label>
                        <input type="text" className={styles.formInput} placeholder="Enter a catchy title"
                            value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Description</label>
                        <textarea className={styles.formTextarea} placeholder="Tell the story behind this video"
                            value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </div>

                {/* ─── SECTION 2: Cause / Campaign ─── */}
                <div style={sectionStyle}>
                    <div style={sectionHeader}>🎯 Linked Cause (members vote on this)</div>

                    {/* Toggle existing vs new */}
                    {activeCauses.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                            {(['existing', 'new'] as const).map(m => (
                                <button key={m} type="button"
                                    onClick={() => setCauseMode(m)}
                                    style={{
                                        padding: '8px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px',
                                        cursor: 'pointer', border: '1.5px solid',
                                        borderColor: causeMode === m ? '#dc2626' : '#e2e8f0',
                                        background: causeMode === m ? '#fff5f6' : '#f8fafc',
                                        color: causeMode === m ? '#dc2626' : '#64748b',
                                    }}
                                >
                                    {m === 'existing' ? 'Use Existing Cause' : '+ Create New Cause'}
                                </button>
                            ))}
                        </div>
                    )}

                    {causeMode === 'existing' ? (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Select Cause *</label>
                            <select className={styles.formSelect} value={selectedExistingCauseId}
                                onChange={e => setSelectedExistingCauseId(e.target.value)} required>
                                <option value="">— Pick a cause —</option>
                                {activeCauses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Cause Name *</label>
                                <input type="text" className={styles.formInput} placeholder="e.g. Disaster Relief Fund"
                                    value={causeName} onChange={e => setCauseName(e.target.value)} required={causeMode === 'new'} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Category *</label>
                                <select className={styles.formSelect} value={causeCategory}
                                    onChange={e => setCauseCategory(e.target.value)} required={causeMode === 'new'}>
                                    <option value="">— Pick category —</option>
                                    <option value="disaster">Disaster Response</option>
                                    <option value="medical">Medical Relief</option>
                                    <option value="education">Education</option>
                                    <option value="poverty">Poverty Alleviation</option>
                                    <option value="housing">Housing</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Fundraising Goal ($) *</label>
                                <input type="number" className={styles.formInput} placeholder="e.g. 5000"
                                    value={causeGoal} onChange={e => setCauseGoal(e.target.value)} min="1" required={causeMode === 'new'} />
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── SECTION 3: Voting Cycle ─── */}
                <div style={sectionStyle}>
                    <div style={sectionHeader}>🗳️ Voting Cycle</div>

                    {activeCycle ? (
                        <div style={{
                            padding: '14px 18px', borderRadius: '12px',
                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                            fontSize: '13px', fontWeight: 600, color: '#16a34a',
                        }}>
                            🟢 Using active cycle: <strong>{activeCycle.name}</strong> — this cause will be added automatically.
                        </div>
                    ) : (
                        <>
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                                No active cycle found. Fill in the details below to create one for this video:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Cycle Name</label>
                                    <input type="text" className={styles.formInput} placeholder="e.g. May 2026 Cycle"
                                        value={cycleName} onChange={e => setCycleName(e.target.value)} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Start Date</label>
                                    <input type="date" className={styles.formInput}
                                        value={cycleStart} onChange={e => setCycleStart(e.target.value)} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>End Date</label>
                                    <input type="date" className={styles.formInput}
                                        value={cycleEnd} onChange={e => setCycleEnd(e.target.value)} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Submit */}
                {uploading && step && (
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '12px' }}>
                        ⏳ {step}
                    </div>
                )}
                <button type="submit" className={styles.submitBtn} disabled={uploading}>
                    {uploading ? 'Processing…' : '🚀 Submit Reel & Set Up Voting'}
                </button>
            </form>
        </div>
    );
}

const sectionStyle: React.CSSProperties = {
    background: '#f8fafc', border: '1px solid #f1f5f9',
    borderRadius: '16px', padding: '20px', marginBottom: '20px',
};

const sectionHeader: React.CSSProperties = {
    fontSize: '13px', fontWeight: 800, color: '#0f172a',
    marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px',
};



function VideoModerationSection() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

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
                                    <div 
                                        style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}
                                        onClick={() => setSelectedVideo(video)}
                                        title="Click to play video reel"
                                    >
                                        <div style={{ position: 'relative', width: '40px', height: '60px', backgroundColor: '#0f172a', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {video.thumbnailUrl ? (
                                                <img src={video.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : video.videoUrl ? (
                                                <video 
                                                    src={video.videoUrl} 
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                    preload="metadata"
                                                    muted
                                                    playsInline
                                                />
                                            ) : (
                                                <Film size={16} color="white" />
                                            )}
                                            {/* Play button overlay */}
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

            {selectedVideo && (
                <VideoPlayerModal 
                    video={selectedVideo} 
                    onClose={() => setSelectedVideo(null)} 
                />
            )}
        </div>
    );
}

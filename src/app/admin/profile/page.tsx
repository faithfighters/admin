'use client';

import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import styles from './profile.module.css';
import { User, Shield, Key, CheckCircle, AlertCircle, RefreshCw, Camera } from 'lucide-react';

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfileContent />
        </ProtectedRoute>
    );
}

function ProfileContent() {
    const { user, refreshUser } = useAuth();
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [submitting, setSubmitting] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
        }
    }, [user]);

    if (!user) return null;

    const initials = user.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'A';

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSuccessMessage('');
        setErrorMessage('');
        setUploadingPhoto(true);

        try {
            // Step 1: Request presigned S3 URL
            const presignRes = await fetch('/api/upload/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentType: file.type,
                    fileSizeBytes: file.size,
                    folder: 'thumbnails' // S3 bucket folder for images/avatars
                })
            });

            if (!presignRes.ok) {
                const errData = await presignRes.json();
                throw new Error(errData.message || 'Failed to generate presigned upload URL.');
            }

            const { uploadUrl, publicUrl } = await presignRes.json();

            // Step 2: Upload file directly to S3 Bucket
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (!uploadRes.ok) {
                throw new Error('Failed to upload image file to cloud storage.');
            }

            // Step 3: Update user's profile photo url in the database
            const updateRes = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: publicUrl })
            });

            if (!updateRes.ok) {
                const errData = await updateRes.json();
                throw new Error(errData.message || 'Failed to update user profile image.');
            }

            setSuccessMessage('Profile photo updated successfully!');
            await refreshUser(); // Hot-reload current admin profile layout states
        } catch (err: any) {
            setErrorMessage(err.message || 'An error occurred while uploading your profile photo.');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input element
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');

        if (!name.trim()) {
            setErrorMessage('Name cannot be empty.');
            return;
        }

        // Validate password change if provided
        if (password) {
            if (password.length < 8) {
                setErrorMessage('New password must be at least 8 characters long.');
                return;
            }
            if (password !== confirmPassword) {
                setErrorMessage('New passwords do not match.');
                return;
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    ...(password ? { password } : {})
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccessMessage('Profile updated successfully!');
                setPassword('');
                setConfirmPassword('');
                await refreshUser(); // Refresh global auth state (updates sidebar & header)
            } else {
                setErrorMessage(data.message || 'Failed to update profile.');
            }
        } catch {
            setErrorMessage('A network error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.profileWrapper}>
            <div className={styles.profileHeader}>
                <h1 className={styles.title}>My Profile</h1>
                <p className={styles.subtitle}>Manage your administrative identity and credentials</p>
            </div>

            <div className={styles.gridContainer}>
                {/* Profile Card */}
                <div className={styles.profileCard}>
                    <div className={styles.cardHeaderBg} />
                    
                    <div className={styles.avatarWrapper} onClick={() => !uploadingPhoto && fileInputRef.current?.click()}>
                        {uploadingPhoto ? (
                            <div className={styles.avatarUploading}>
                                <RefreshCw size={18} className="animate-spin" style={{ marginBottom: 4 }} />
                                <span>Uploading…</span>
                            </div>
                        ) : (
                            <div className={styles.avatarOverlay}>
                                <Camera size={18} />
                                <span>Change</span>
                            </div>
                        )}
                        <div className={styles.avatarImage}>
                            {user.image ? (
                                <img src={user.image} alt={user.name} />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                    </div>

                    {/* Hidden Photo Upload Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    
                    <h2 className={styles.userName}>{user.name}</h2>
                    <p className={styles.userEmail}>{user.email}</p>
                    
                    <span className={`${styles.roleBadge} ${styles.adminBadge}`}>
                        <Shield size={13} style={{ marginRight: 4 }} />
                        {user.role}
                    </span>

                    <div className={styles.metaInfo}>
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>Account Plan:</span>
                            <span className={styles.metaValue} style={{ textTransform: 'capitalize' }}>
                                {user.plan ? user.plan.replace('_', ' ') : 'Administrator'}
                            </span>
                        </div>
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>Member Since:</span>
                            <span className={styles.metaValue}>
                                {user.joinedAt
                                    ? new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                    : 'Mar 2024'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form Panels */}
                <div className={styles.panelWrapper}>
                    <div className={styles.panelCard}>
                        <h3 className={styles.cardTitle}>Account Details</h3>
                        <form onSubmit={handleUpdateProfile}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Full Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Administrator Name"
                                        required
                                        disabled={submitting}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email Address (Login ID)</label>
                                    <input
                                        type="email"
                                        className={`${styles.input} ${styles.inputDisabled}`}
                                        value={user.email}
                                        disabled
                                    />
                                </div>

                                <div className={`${styles.formGroup} ${styles.formGroupFull}`} style={{ marginTop: 12 }}>
                                    <h4 className={styles.label} style={{ fontSize: 14, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Key size={14} /> Update Password
                                    </h4>
                                    <p className={styles.subtitle} style={{ marginBottom: 12 }}>Leave fields blank if you do not want to change your password</p>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>New Password</label>
                                    <input
                                        type="password"
                                        className={styles.input}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        disabled={submitting}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Confirm New Password</label>
                                    <input
                                        type="password"
                                        className={styles.input}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter password"
                                        disabled={submitting}
                                    />
                                </div>
                            </div>

                            {successMessage && (
                                <div className={`${styles.statusMessage} ${styles.successMessage}`}>
                                    <CheckCircle size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                                    {successMessage}
                                </div>
                            )}

                            {errorMessage && (
                                <div className={`${styles.statusMessage} ${styles.errorMessage}`}>
                                    <AlertCircle size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                                    {errorMessage}
                                </div>
                            )}

                            <div className={styles.btnRow}>
                                <button
                                    type="submit"
                                    className={`${styles.submitBtn} ${submitting ? styles.submitBtnDisabled : ''}`}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" /> Updating…
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

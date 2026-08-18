'use client';

import { useRef, useState } from 'react';
import { Film, Loader2 } from 'lucide-react';

// Same presign -> PUT -> publicUrl flow as ImageUploader, folder 'videos'
// instead of 'images' (backend caps video uploads at 500MB vs 10MB for images).
async function uploadVideoToS3(file: File): Promise<string> {
  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      contentType: file.type,
      fileSizeBytes: file.size,
      folder: 'videos',
    }),
  });
  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to get upload URL');
  }
  const { uploadUrl, publicUrl } = await presignRes.json();
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!putRes.ok) throw new Error('Upload to storage failed');
  return publicUrl;
}

export default function VideoUploader({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) { setError('Only video files allowed'); return; }
    setError('');
    setUploading(true);
    try {
      const url = await uploadVideoToS3(file);
      onChange(url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</label>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: '2px dashed rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: value ? '14px 16px' : '24px 16px',
          textAlign: value ? 'left' : 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: uploading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
        }}
      >
        {value ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Film size={20} color="#F8C38F" />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', wordBreak: 'break-all' }}>{value}</span>
          </div>
        ) : uploading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            <Loader2 size={24} style={{ marginBottom: 6, animation: 'spin 1s linear infinite' }} />
            Uploading…
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <Film size={28} style={{ marginBottom: 6 }} />
            Click or drag to upload
            <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.3)' }}>MP4, MOV, WebM · max 500MB</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={onInputChange} />
      </div>
      {error && <span style={{ fontSize: 12, color: '#F8C38F' }}>{error}</span>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="…or paste a video URL"
        style={{
          padding: '8px 10px', fontSize: 12, borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)',
        }}
      />
    </div>
  );
}

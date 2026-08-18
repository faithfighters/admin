'use client';

import { useRef, useState } from 'react';
import { Images, Loader2 } from 'lucide-react';

// Extracted from admin/events/page.tsx's copy-pasted upload logic — same
// presign -> PUT -> publicUrl flow, unchanged, now shared by any admin form
// that needs a single-image field (including Page Content's `image` fields).
export async function uploadImageToS3(file: File): Promise<string> {
  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      contentType: file.type,
      fileSizeBytes: file.size,
      folder: 'images',
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

export default function ImageUploader({
  value,
  onChange,
  label,
  placeholder = 'Click or drag to upload',
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Only image files allowed'); return; }
    setError('');
    setUploading(true);
    try {
      const url = await uploadImageToS3(file);
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
      <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: '2px dashed rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: value ? 0 : '24px 16px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: uploading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
          transition: 'border-color 0.2s',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {value ? (
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="preview" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>Click to replace</span>
            </div>
          </div>
        ) : uploading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            <Loader2 size={24} style={{ marginBottom: 6, animation: 'spin 1s linear infinite' }} />
            Uploading…
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <Images size={28} style={{ marginBottom: 6 }} />
            {placeholder}
            <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.3)' }}>JPG, PNG, WebP · max 10MB</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onInputChange} />
      </div>
      {error && <span style={{ fontSize: 12, color: '#F8C38F' }}>{error}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          style={{
            flex: 1, padding: '8px 10px', fontSize: 12, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)',
          }}
        />
      </div>
    </div>
  );
}

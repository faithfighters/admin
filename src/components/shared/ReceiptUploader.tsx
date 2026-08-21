'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, Paperclip } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function uploadReceiptToS3(file: File): Promise<string> {
  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      contentType: file.type,
      fileSizeBytes: file.size,
      folder: 'documents',
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

export default function ReceiptUploader({
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
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Only JPG, PNG, WebP, or PDF allowed'); return; }
    setError('');
    setUploading(true);
    try {
      const url = await uploadReceiptToS3(file);
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
          padding: '16px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: uploading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
        }}
      >
        {uploading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…
          </div>
        ) : value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#60a5fa', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            <FileText size={16} /> Receipt attached — view / replace
          </a>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Paperclip size={16} /> Click or drag to attach a receipt (JPG, PNG, or PDF)
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }} onChange={onInputChange} />
      </div>
      {error && <span style={{ fontSize: 12, color: '#F8C38F' }}>{error}</span>}
    </div>
  );
}

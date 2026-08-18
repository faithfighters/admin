'use client';

import { Plus, Trash2 } from 'lucide-react';
import ImageUploader from '@/components/shared/ImageUploader';
import VideoUploader from '@/components/shared/VideoUploader';
import { SiteContentRepeaterFieldDef } from '@/lib/types';
import styles from '@/app/admin/page.module.css';

export default function RepeaterField({
    def, value, onChange,
}: {
    def: SiteContentRepeaterFieldDef;
    value: Record<string, any>[];
    onChange: (items: Record<string, any>[]) => void;
}) {
    const updateItem = (index: number, key: string, itemValue: any) => {
        const next = value.map((item, i) => (i === index ? { ...item, [key]: itemValue } : item));
        onChange(next);
    };

    const addItem = () => {
        const blank = Object.fromEntries(def.itemFields.map(f => [f.key, '']));
        onChange([...value, blank]);
    };

    const removeItem = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {value.map((item, i) => (
                <div
                    key={i}
                    style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                            {def.itemLabel} {i + 1}
                        </span>
                        <button
                            type="button"
                            onClick={() => removeItem(i)}
                            aria-label={`Remove ${def.itemLabel} ${i + 1}`}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                                color: '#F8C38F', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <Trash2 size={13} /> Remove
                        </button>
                    </div>

                    {def.itemFields.map(itemField => (
                        <div key={itemField.key} className={styles.formGroup} style={{ marginBottom: 0 }}>
                            <label className={styles.formLabel}>{itemField.label}</label>
                            {itemField.type === 'image' ? (
                                <ImageUploader
                                    value={item[itemField.key] || ''}
                                    onChange={url => updateItem(i, itemField.key, url)}
                                    label=""
                                />
                            ) : itemField.type === 'video' ? (
                                <VideoUploader
                                    value={item[itemField.key] || ''}
                                    onChange={url => updateItem(i, itemField.key, url)}
                                    label=""
                                />
                            ) : itemField.type === 'textarea' ? (
                                <textarea
                                    className={styles.formTextarea}
                                    value={item[itemField.key] || ''}
                                    onChange={e => updateItem(i, itemField.key, e.target.value)}
                                />
                            ) : (
                                <input
                                    className={styles.formInput}
                                    type="text"
                                    value={item[itemField.key] || ''}
                                    onChange={e => updateItem(i, itemField.key, e.target.value)}
                                />
                            )}
                        </div>
                    ))}
                </div>
            ))}

            <button
                type="button"
                onClick={addItem}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px', borderRadius: 10, border: '1.5px dashed rgba(255,255,255,0.15)',
                    background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
            >
                <Plus size={15} /> Add {def.itemLabel}
            </button>
        </div>
    );
}

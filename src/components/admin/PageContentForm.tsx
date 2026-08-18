'use client';

import ImageUploader from '@/components/shared/ImageUploader';
import RepeaterField from '@/components/admin/RepeaterField';
import { SiteContentPageManifest } from '@/lib/types';
import styles from '@/app/admin/page.module.css';

export default function PageContentForm({
    manifest, values, onChange,
}: {
    manifest: SiteContentPageManifest;
    values: Record<string, any>;
    onChange: (key: string, value: any) => void;
}) {
    const sections = new Map<string, typeof manifest.fields>();
    for (const field of manifest.fields) {
        const section = field.section || 'General';
        if (!sections.has(section)) sections.set(section, []);
        sections.get(section)!.push(field);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {[...sections.entries()].map(([section, fields]) => (
                <div key={section}>
                    <h3 style={{
                        fontSize: 15, fontWeight: 700, color: '#ffffff', margin: '0 0 16px',
                        paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        {section}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {fields.map(field => (
                            <div key={field.key} className={styles.formGroup} style={{ marginBottom: 0 }}>
                                {field.type !== 'repeater' && field.type !== 'image' && <label className={styles.formLabel}>{field.label}</label>}
                                {field.helpText && (
                                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px' }}>{field.helpText}</p>
                                )}

                                {field.type === 'text' && (
                                    <input
                                        className={styles.formInput}
                                        type="text"
                                        maxLength={field.maxLength}
                                        value={values[field.key] ?? field.defaultValue}
                                        onChange={e => onChange(field.key, e.target.value)}
                                    />
                                )}

                                {field.type === 'textarea' && (
                                    <textarea
                                        className={styles.formTextarea}
                                        value={values[field.key] ?? field.defaultValue}
                                        onChange={e => onChange(field.key, e.target.value)}
                                    />
                                )}

                                {field.type === 'image' && (
                                    <ImageUploader
                                        value={values[field.key] ?? field.defaultValue}
                                        onChange={url => onChange(field.key, url)}
                                        label={field.label}
                                    />
                                )}

                                {field.type === 'repeater' && (
                                    <>
                                        <label className={styles.formLabel} style={{ marginBottom: 12, display: 'block' }}>{field.label}</label>
                                        <RepeaterField
                                            def={field}
                                            value={values[field.key] ?? field.defaultValue}
                                            onChange={items => onChange(field.key, items)}
                                        />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

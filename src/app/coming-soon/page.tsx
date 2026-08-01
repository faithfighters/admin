'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function ComingSoonPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className={styles.page}>
            {/* Full-bleed flag background — uses the bright hero-flag */}
            <div className={styles.bgWrapper}>
                <Image
                    src="/images/coming-soon-bg.png"
                    alt="American flag waving"
                    fill
                    className={styles.bgImage}
                    priority
                    quality={100}
                />
                {/* Left-to-right dark gradient (Figma: Rectangle 3263) */}
                <div className={styles.overlay} />
            </div>

            {/* FFFA Logo — top center (Figma: image 40, ~667px left on 1440 = ~center) */}
            <div className={styles.logoWrapper}>
                <Image
                    src="/images/fffa-logo.png"
                    alt="Faith Fighters For America"
                    width={105}
                    height={150}
                    className={styles.logo}
                    priority
                />
            </div>

            {/* Main content group (Figma: Group 1000002463 — left:204, top:239, w:1031) */}
            <div className={`${styles.content} ${mounted ? styles.contentVisible : ''}`}>

                {/* Tagline row (Figma: Group 1000002461) */}
                <div className={styles.tagline}>
                    <span className={styles.tagBlue}>ONE NATION.</span>
                    <span className={styles.tagWhite}>ONE SPIRIT.</span>
                    <span className={styles.tagRed}>ONE MISSION.</span>
                </div>

                {/* COMING SOON (Figma: 150px Roboto 900, centered) */}
                <h1 className={styles.comingSoon}>COMING SOON</h1>

                {/* Buttons (Figma: Group 1000002459 + Group 1000002462) */}
                <div className={styles.actions}>
                    <Link href="/join" className={styles.donateBtn}>
                        Donate
                    </Link>
                    <Link href="/join" className={styles.joinBtn}>
                        Join Now
                    </Link>
                </div>
            </div>

            {/* Bottom-right star decoration */}
            <div className={styles.starDecoration}>
                <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
                    <path
                        d="M24 2L29.5 18H47L33.5 27.5L39 44L24 34.5L9 44L14.5 27.5L1 18H18.5L24 2Z"
                        fill="rgba(255,255,255,0.35)"
                        stroke="rgba(255,255,255,0.6)"
                        strokeWidth="1.5"
                    />
                </svg>
            </div>
        </div>
    );
}

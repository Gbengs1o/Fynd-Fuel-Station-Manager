'use client';

import { useState, useEffect } from 'react';
import { Flame, Clock, Zap, Crown } from 'lucide-react';
import styles from '../promotions/promotions.module.css';

interface ActivePromotionCardProps {
    promotion: any;
}

export default function ActivePromotionCard({ promotion }: ActivePromotionCardProps) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTime = () => {
            const end = new Date(promotion.end_time).getTime();
            const now = new Date().getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${h}h ${m}m remaining`);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 60000);
        return () => clearInterval(interval);
    }, [promotion.end_time]);

    const getIcon = () => {
        if (promotion.tier?.name?.includes('Quick')) return <Flame size={20} />;
        if (promotion.tier?.name?.includes('Area')) return <Zap size={20} />;
        return <Crown size={20} />;
    };

    return (
        <div className={styles.statCard} style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid #fbbf24',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                width: '60px',
                height: '60px',
                background: '#fbbf24',
                borderRadius: '50%',
                opacity: 0.1,
                filter: 'blur(20px)'
            }} />

            <div className={styles.statIcon} style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
                {getIcon()}
            </div>
            <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Active Promotion</div>
            <div className={styles.statValue} style={{ color: 'white' }}>{promotion.tier?.name || 'Boost Active'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <div className={styles.statChange} style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> {timeLeft}
                </div>
                {promotion.views !== undefined && (
                    <div style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: '600' }}>
                        {promotion.views} Reach
                    </div>
                )}
            </div>
        </div>
    );
}

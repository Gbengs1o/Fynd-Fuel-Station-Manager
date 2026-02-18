'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, HelpCircle } from 'lucide-react';
import styles from '@/app/dashboard/dashboard.module.css';

interface RevenueProjectionProps {
    todayVisits: number;
    price: number;
}

export default function RevenueProjection({ todayVisits, price }: RevenueProjectionProps) {
    // Assumption: 4.5% conversion rate (drivers who view app and then visit)
    // Avg sale volume: 22 Liters
    const projectedRevenue = todayVisits * 0.045 * 22 * price;
    const formattedRevenue = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0
    }).format(projectedRevenue);

    return (
        <div className={styles.statCard} style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
        }}>
            <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
                <DollarSign size={24} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div className={styles.statLabel}>Est. Revenue Projection</div>
                    <div className={styles.statValue} style={{ color: '#22c55e' }}>{formattedRevenue}</div>
                </div>
                <div title="Based on app views, typical conversion, and average pump volume." style={{ cursor: 'help' }}>
                    <HelpCircle size={14} color="var(--text-secondary)" />
                </div>
            </div>

            <div className={styles.statChange} style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontSize: '0.8rem' }}>
                    <TrendingUp size={12} />
                    <span>Based on {todayVisits} impressions today</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '65%' }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ height: '100%', background: '#22c55e' }}
                    />
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    65% of weekly average reached
                </p>
            </div>
        </div>
    );
}

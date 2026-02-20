'use client';

import { useState } from 'react';
import { X, Zap, Crown, Rocket, Check } from 'lucide-react';
import { activatePromotion } from '@/app/dashboard/promotions/actions';
import styles from './promotions.module.css';

interface BoostModalProps {
    isOpen: boolean;
    onClose: () => void;
    tiers: any[];
    walletBalance: number;
    stationId: number;
}

export default function BoostModal({ isOpen, onClose, tiers, walletBalance, stationId }: BoostModalProps) {
    const [selectedTier, setSelectedTier] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleActivate = async () => {
        if (!selectedTier) return;
        if (walletBalance < selectedTier.price) {
            alert('Insufficient funds. Please top up your wallet.');
            return;
        }

        setIsSubmitting(true);
        try {
            await activatePromotion(stationId, selectedTier.id);
            alert('Promotion activated successfully!');
            onClose();
        } catch (error: any) {
            alert(error.message || 'Failed to activate promotion');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getIcon = (name: string) => {
        if (name.includes('Quick')) return <Rocket size={24} />;
        if (name.includes('Area')) return <Zap size={24} />;
        return <Crown size={24} />;
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Boost Your Station</h2>
                        <p style={{ color: '#64748b' }}>Select a promotion tier to increase visibility.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X />
                    </button>
                </div>

                <div className={styles.tierGrid}>
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            className={`${styles.tierCard} ${selectedTier?.id === tier.id ? styles.tierCardActive : ''}`}
                            onClick={() => setSelectedTier(tier)}
                        >
                            <div style={{ color: selectedTier?.id === tier.id ? '#3b82f6' : '#64748b' }}>
                                {getIcon(tier.name)}
                            </div>
                            <h4>{tier.name}</h4>
                            <div className={styles.tierPrice}>₦{tier.price.toLocaleString()}</div>
                            <div className={styles.tierDuration}>{tier.duration_hours} Hours</div>
                        </div>
                    ))}
                </div>

                {selectedTier && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#1e293b' }}>Features included:</h5>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#64748b' }}>
                            {tier.features?.map((f: string, i: number) => (
                                <li key={i}>{f.replace('_', ' ')}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Wallet Balance</span>
                        <div style={{ fontWeight: '700' }}>₦{walletBalance.toLocaleString()}</div>
                    </div>
                    <button
                        className="btn-primary"
                        onClick={handleActivate}
                        disabled={!selectedTier || isSubmitting}
                    >
                        {isSubmitting ? 'Activating...' : 'Confirm & Pay'}
                    </button>
                </div>
            </div>
        </div>
    );
}

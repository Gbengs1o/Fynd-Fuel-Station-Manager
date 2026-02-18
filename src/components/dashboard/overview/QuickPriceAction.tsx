'use client';

import { useState } from 'react';
import { Edit3, Check, X, Loader2 } from 'lucide-react';
import { updateSinglePrice } from '@/app/dashboard/pricing/actions';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickPriceActionProps {
    fuelType: string;
    initialPrice: number;
}

export default function QuickPriceAction({ fuelType, initialPrice }: QuickPriceActionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [price, setPrice] = useState(initialPrice);
    const [tempPrice, setTempPrice] = useState(initialPrice.toString());
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdate = async () => {
        const newPriceNum = parseFloat(tempPrice);
        if (isNaN(newPriceNum) || newPriceNum === price) {
            setIsEditing(false);
            return;
        }

        setIsUpdating(true);
        try {
            await updateSinglePrice(fuelType, newPriceNum);
            setPrice(newPriceNum);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update price:', error);
            alert('Failed to update price');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
            <AnimatePresence mode="wait">
                {!isEditing ? (
                    <motion.div
                        key="display"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        onClick={() => setIsEditing(true)}
                    >
                        <span style={{ fontSize: '2rem', fontWeight: 700 }}>₦{price}</span>
                        <Edit3 size={16} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            border: '1px solid var(--primary)'
                        }}
                    >
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>₦</span>
                        <input
                            autoFocus
                            type="number"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdate();
                                if (e.key === 'Escape') setIsEditing(false);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                width: '100px',
                                outline: 'none'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                style={{
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={isUpdating}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

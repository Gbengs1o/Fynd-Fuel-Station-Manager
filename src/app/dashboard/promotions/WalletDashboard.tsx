'use client';

import { useState } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { mockTopUp } from '@/app/dashboard/promotions/actions';
import styles from './promotions.module.css';

interface WalletDashboardProps {
    wallet: any;
    transactions: any[];
}

export default function WalletDashboard({ wallet, transactions }: WalletDashboardProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleMockTopUp = async () => {
        if (!confirm('This is a mock top-up for testing. Add ₦10,000 to your wallet?')) return;

        setIsRefreshing(true);
        try {
            await mockTopUp(10000);
        } catch (error) {
            console.error(error);
            alert('Failed to top up wallet');
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className={styles.walletContainer}>
            <div className={styles.balanceCard}>
                <div className={styles.balanceHeader}>
                    <span>Available Balance</span>
                    <Wallet size={20} />
                </div>
                <div className={styles.balanceValue}>
                    ₦{wallet?.balance?.toLocaleString() || '0'}
                </div>
                <div className={styles.balanceActions}>
                    <button
                        className="btn-primary"
                        onClick={handleMockTopUp}
                        disabled={isRefreshing}
                    >
                        <Plus size={16} /> Top Up Wallet
                    </button>
                </div>
            </div>

            <div className={styles.historyCard}>
                <div className={styles.historyHeader}>
                    <h3>Recent Transactions</h3>
                    <button className="btn-secondary" style={{ padding: '4px 12px' }}>View All</button>
                </div>
                <div className={styles.transactionList}>
                    {transactions.length > 0 ? (
                        transactions.map((tx) => (
                            <div key={tx.id} className={styles.transactionItem}>
                                <div className={styles.transactionInfo}>
                                    <h4>{tx.type === 'deposit' ? 'Wallet Top-up' : tx.metadata?.promotion_tier || 'Promotion'}</h4>
                                    <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className={`${styles.amount} ${tx.type === 'deposit' ? styles.amountDeposit : styles.amountSpending}`}>
                                    {tx.type === 'deposit' ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No transactions yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

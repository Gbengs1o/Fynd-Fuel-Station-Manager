'use client';

import { useState, useEffect } from 'react';
import styles from '../dashboard.module.css';
import promoStyles from './promotions.module.css';
import { Flame, Award, Percent, Rocket, Plus } from 'lucide-react';
import { getWalletInfo, getPromotionTiers, getCampaignHistory } from './actions';
import WalletDashboard from './WalletDashboard';
import BoostModal from './BoostModal';
import { createClient } from '@/utils/supabase/client';

export default function PromotionsPage() {
    const [walletData, setWalletData] = useState<any>(null);
    const [tiers, setTiers] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [stationId, setStationId] = useState<number | null>(null);

    const fetchData = async () => {
        try {
            const [wData, tData] = await Promise.all([
                getWalletInfo(),
                getPromotionTiers()
            ]);
            setWalletData(wData);
            setTiers(tData);

            // Fetch Manager Station ID
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('manager_profiles')
                    .select('station_id')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    const sid = Number(profile.station_id);
                    setStationId(sid);
                    const hData = await getCampaignHistory(sid);
                    setHistory(hData);
                }
            }
        } catch (error) {
            console.error('Error fetching promotion data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (isLoading) return <div className={styles.dashboard}>Loading promotional tools...</div>;

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <div>
                    <h1>Promotional Tools</h1>
                    <p>Boost your station&apos;s visibility and drive more sales</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setIsModalOpen(true)}
                    disabled={!stationId}
                >
                    <Plus size={16} /> Create New Promotion
                </button>
            </header>

            <WalletDashboard
                wallet={walletData?.wallet}
                transactions={walletData?.transactions || []}
            />

            <div className={styles.promoGrid}>
                <div className={styles.promoCard} style={{ '--accent': '#f59e0b' } as any}>
                    <div className={styles.promoIcon}><Flame /></div>
                    <div className={styles.promoContent}>
                        <h3>Flash Sale</h3>
                        <p>Boost traffic immediately with a time-limited price drop.</p>
                        <button className={styles.promoBtn} onClick={() => setIsModalOpen(true)}>
                            Activate Flash Sale <Rocket size={16} />
                        </button>
                    </div>
                </div>

                <div className={styles.promoCard} style={{ '--accent': '#9b59ff' } as any}>
                    <div className={styles.promoIcon}><Award /></div>
                    <div className={styles.promoContent}>
                        <h3>Featured Station</h3>
                        <p>Get listed at the top of search results for 24 hours.</p>
                        <button className={styles.promoBtn} onClick={() => setIsModalOpen(true)}>
                            Go Featured <Rocket size={16} />
                        </button>
                    </div>
                </div>

                <div className={styles.promoCard} style={{ '--accent': '#10b981' } as any}>
                    <div className={styles.promoIcon}><Percent /></div>
                    <div className={styles.promoContent}>
                        <h3>Loyalty Program</h3>
                        <p>Reward frequent customers with exclusive points/discounts.</p>
                        <button className={styles.promoBtn} onClick={() => alert('Loyalty program coming soon!')}>
                            Manage Rewards <Rocket size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={promoStyles.promotionHistory}>
                <h2>Campaign History</h2>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Campaign Tier</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Reach (Views)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? (
                                history.map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td style={{ fontWeight: '600' }}>{campaign.tier?.name}</td>
                                        <td>{new Date(campaign.start_time).toLocaleDateString()} {new Date(campaign.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{new Date(campaign.end_time).toLocaleDateString()} {new Date(campaign.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{campaign.views || 0}</td>
                                        <td>
                                            <span className={campaign.status === 'active' ? styles.statusActive : styles.statusCompleted}>
                                                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        No promotion history found. Start your first boost above!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <BoostModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    fetchData(); // Refresh wallet after activation
                }}
                tiers={tiers}
                walletBalance={walletData?.wallet?.balance || 0}
                stationId={stationId || 0}
            />
        </div>
    );
}

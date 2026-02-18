'use client';

import { createClient } from '@/utils/supabase/client';
import styles from './dashboard.module.css';
import {
    TrendingUp,
    Users,
    Droplet,
    Activity,
    AlertTriangle,
    Award
} from 'lucide-react';
import CompetitorWatch from '@/components/dashboard/overview/CompetitorWatch';
import FeedbackSnapshot from '@/components/dashboard/overview/FeedbackSnapshot';
import StockOutToggle from '@/components/dashboard/pricing/StockOutToggle';
import MarketTrendChart from '@/components/dashboard/overview/MarketTrendChart';
import MobileQuickUpdate from '@/components/dashboard/overview/MobileQuickUpdate';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import QuickPriceAction from '@/components/dashboard/overview/QuickPriceAction';
import RevenueProjection from '@/components/dashboard/overview/RevenueProjection';

export default function DashboardOverview() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Manager & Station Info
            const { data: profile } = await supabase
                .from('manager_profiles')
                .select('station_id')
                .eq('id', user?.id)
                .single();

            const { data: station } = await supabase
                .from('stations')
                .select('*')
                .eq('id', profile?.station_id)
                .single();

            // 2. Fetch Nearest 3 Competitors
            const userLat = station?.latitude || 7.404818;
            const userLon = station?.longitude || 3.810341;

            const { data: nearby } = await supabase
                .from('stations')
                .select('id, name, brand, price_pms, latitude, longitude')
                .eq('state', station?.state || 'Oyo')
                .neq('id', station?.id)
                .limit(10);

            const formattedCompetitors = (nearby || [])
                .map(c => {
                    const lat1 = userLat;
                    const lon1 = userLon;
                    const lat2 = c.latitude || 0;
                    const lon2 = c.longitude || 0;
                    const R = 6371; // km
                    const dLat = (lat2 - lat1) * Math.PI / 180;
                    const dLon = (lon2 - lon1) * Math.PI / 180;
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
                    return { ...c, distanceValue: dist, distance: `${dist.toFixed(1)}km` };
                })
                .sort((a, b) => a.distanceValue - b.distanceValue)
                .slice(0, 3)
                .map(c => ({
                    ...c,
                    price_pms: parseFloat(c.price_pms as any) || 645
                }));

            // 3. Fetch Recent Feedback
            const { data: feedbacks } = await supabase
                .from('reviews')
                .select('*')
                .eq('station_id', station?.id)
                .order('created_at', { ascending: false })
                .limit(5);

            // 4. Fetch User Reports (Ground Truth)
            const { data: reports } = await supabase
                .from('price_reports')
                .select('*')
                .eq('station_id', station?.id)
                .order('created_at', { ascending: false })
                .limit(10);

            // 5. Fetch Analytics (Daily Visits)
            const { data: analytics } = await supabase
                .from('station_analytics')
                .select('daily_visits, date, profile_views')
                .eq('station_id', station?.id)
                .order('date', { ascending: false })
                .limit(2);

            const todayVisits = analytics?.[0]?.daily_visits || 0;
            const yesterdayVisits = analytics?.[1]?.daily_visits || 0;
            const visitGrowth = yesterdayVisits > 0
                ? ((todayVisits - yesterdayVisits) / yesterdayVisits) * 100
                : 0;

            // 6. Fetch Price History for Chart
            const { data: priceHistory } = await supabase
                .from('price_logs')
                .select('new_price, created_at')
                .eq('station_id', station?.id)
                .eq('fuel_type', 'PMS')
                .order('created_at', { ascending: true })
                .limit(7);

            const validCompetitors = nearby?.filter(c => c.price_pms > 0) || [];
            const realMarketAvg = validCompetitors.length > 0
                ? validCompetitors.reduce((acc, c) => acc + (c.price_pms || 0), 0) / validCompetitors.length
                : 645;

            const priceDiff = (station?.price_pms || 0) - realMarketAvg;

            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const trendData = Array.from({ length: 7 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dayName = days[date.getDay()];
                const historicPrice = priceHistory?.find(p => new Date(p.created_at).getDate() === date.getDate())?.new_price
                    || station?.price_pms
                    || 640;

                return {
                    day: dayName,
                    yourPrice: Number(historicPrice),
                    marketAvg: Math.round(realMarketAvg)
                };
            });

            const analyticsData = analytics as any[] | null;
            const todayAnalytics = analyticsData?.[0];

            // Fallback to yesterday if today is empty (for demo continuity)
            const displayViews = todayAnalytics?.profile_views || analyticsData?.[1]?.profile_views || 0;

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { data: reportTimestamps } = await supabase
                .from('price_reports')
                .select('created_at')
                .eq('station_id', station?.id)
                .gte('created_at', sevenDaysAgo.toISOString())
                .limit(1000);

            const hourCounts: Record<number, number> = {};
            (reportTimestamps || []).forEach(r => {
                const hour = new Date(r.created_at).getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });

            const peakHour24 = Object.keys(hourCounts).length > 0
                ? Object.entries(hourCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
                : null;

            const peakHourLabel = peakHour24
                ? `${Number(peakHour24) % 12 || 12}${Number(peakHour24) >= 12 ? 'PM' : 'AM'}`
                : '4PM';

            setData({
                station,
                profile,
                formattedCompetitors,
                feedbacks,
                reports,
                todayVisits,
                visitGrowth,
                priceDiff,
                trendData,
                displayViews,
                peakHourLabel
            });
            setLoading(false);
        }
        fetchData();
    }, []);

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 40, height: 40, border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
    </div>;

    const {
        station,
        formattedCompetitors,
        feedbacks,
        reports,
        todayVisits,
        visitGrowth,
        priceDiff,
        trendData,
        displayViews,
        peakHourLabel
    } = data;

    const containerVars = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVars = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={containerVars}
        >
            <div className={styles.mobileOnly}>
                <MobileQuickUpdate
                    station={station}
                    reports={reports || []}
                    competitors={formattedCompetitors}
                    totalViews={displayViews}
                    peakHour={peakHourLabel}
                />
            </div>

            <div className={`${styles.dashboard} ${styles.desktopOnly}`}>
                <motion.header variants={itemVars} className={styles.header}>
                    <div>
                        <h1>Dashboard Overview</h1>
                        <p>Welcome back! Here&apos;s a summary of your station&apos;s performance.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className="btn-primary">Daily Report</button>
                    </div>
                </motion.header>

                <div className={styles.mainContent}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Main Stats */}
                        <div className={styles.statsGrid}>
                            <motion.div variants={itemVars} className={styles.statCard} whileHover={{ y: -5 }}>
                                <div className={styles.statIcon} style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--primary)' }}>
                                    <TrendingUp size={24} />
                                </div>
                                <div className={styles.statLabel}>Market Position</div>
                                <div className={styles.statValue}>{priceDiff <= 0 ? 'Competitive' : 'Above Avg'}</div>
                                <div className={styles.statChange} style={{ color: priceDiff <= 0 ? '#22c55e' : '#ef4444' }}>
                                    {priceDiff <= 0 ? `₦${Math.abs(Math.round(priceDiff))} below` : `₦${Math.round(priceDiff)} above`} market avg
                                </div>
                            </motion.div>

                            <motion.div variants={itemVars} className={styles.statCard} whileHover={{ y: -5 }}>
                                <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                                    <Users size={24} />
                                </div>
                                <div className={styles.statLabel}>Daily Customers</div>
                                <div className={styles.statValue}>{todayVisits.toLocaleString()}</div>
                                <div className={styles.statChange} style={{ color: visitGrowth >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {visitGrowth >= 0 ? '+' : ''}{visitGrowth.toFixed(1)}% since yesterday
                                </div>
                            </motion.div>

                            <motion.div variants={itemVars} className={styles.statCard} whileHover={{ y: -5 }}>
                                <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                    <Droplet size={24} />
                                </div>
                                <div className={styles.statLabel}>PMS Price (Petrol)</div>
                                <QuickPriceAction fuelType="PMS" initialPrice={station?.price_pms || 645} />
                                <div className={styles.statChange} style={{ color: 'var(--text-secondary)' }}>Click to quick-update</div>
                            </motion.div>

                            <motion.div variants={itemVars}>
                                <RevenueProjection todayVisits={displayViews} price={station?.price_pms || 645} />
                            </motion.div>
                        </div>

                        {/* Module Snapshots */}
                        <motion.div variants={itemVars}>
                            <FeedbackSnapshot feedbacks={feedbacks || []} />
                        </motion.div>

                        <motion.div variants={itemVars} className={styles.chartArea}>
                            <div className={styles.sectionHeader}>
                                <h2>Market Opportunity Trend</h2>
                                <p>Your pricing vs the market average (7-day history)</p>
                            </div>
                            <MarketTrendChart data={trendData} />
                        </motion.div>
                    </div>

                    {/* Sidebar Widgets */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <motion.div variants={itemVars}>
                            <StockOutToggle stationId={station?.id} isOutOfStock={station?.is_out_of_stock || false} />
                        </motion.div>

                        <motion.div variants={itemVars}>
                            <CompetitorWatch competitors={formattedCompetitors} yourPrice={station?.price_pms || 1} />
                        </motion.div>

                        <motion.div variants={itemVars} className={styles.recentReports}>
                            <div className={styles.sectionHeader}>
                                <motion.h2
                                    animate={{
                                        color: priceDiff > 0 ? ['#fbbf24', '#fff'] : '#fff'
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                                >
                                    Smart Recommendations
                                </motion.h2>
                            </div>

                            {priceDiff > 0 ? (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={`${styles.alertItem} ${styles.recommendation}`}
                                    style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid #fbbf24' }}
                                >
                                    <TrendingUp size={20} color="#fbbf24" />
                                    <div>
                                        <strong style={{ color: '#fbbf24' }}>Price Opportunity</strong>
                                        <p>You are ₦{Math.round(priceDiff)} above average. Lowering by ₦5 could increase visits by ~12%.</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={`${styles.alertItem} ${styles.recommendation}`}
                                    style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e' }}
                                >
                                    <Award size={20} color="#22c55e" />
                                    <div>
                                        <strong style={{ color: '#22c55e' }}>Highly Competitive</strong>
                                        <p>You have the best price in this area. Maintain this to build driver loyalty.</p>
                                    </div>
                                </motion.div>
                            )}

                            {station?.is_out_of_stock ? (
                                <div className={styles.alertItem} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}>
                                    <AlertTriangle size={20} color="#ef4444" />
                                    <div>
                                        <strong style={{ color: '#ef4444' }}>Station Offline</strong>
                                        <p>Drivers cannot see you in the app.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.alertItem}>
                                    <Activity size={20} color="#22c55e" />
                                    <div>
                                        <strong>All Systems Normal</strong>
                                        <p>Station is visible to all drivers.</p>
                                    </div>
                                </div>
                            )}

                            <div className={styles.alertItem}>
                                <Award size={20} color="var(--primary)" />
                                <div>
                                    <strong>Peak Traffic Forecast</strong>
                                    <p>Heavy traffic expected at {peakHourLabel}. Prepare pumps.</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

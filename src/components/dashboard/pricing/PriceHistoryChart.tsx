'use client';

import styles from '@/app/dashboard/dashboard.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface PriceLog {
    date: string;
    price: number;
}

interface PriceHistoryChartProps {
    logs: PriceLog[];
    stateAverage: number;
}

const PAGE_SIZE = 7;

export default function PriceHistoryChart({ logs, stateAverage }: PriceHistoryChartProps) {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    // Start from the latest data (end of array)
    const [startIndex, setStartIndex] = useState(Math.max(0, logs.length - PAGE_SIZE));

    if (!logs || logs.length === 0) {
        return (
            <div className={styles.chartArea} style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                <Info size={40} style={{ marginBottom: '16px' }} />
                <h3>No Price History Yet</h3>
                <p>Start updating your prices to see trends here.</p>
            </div>
        );
    }

    // Navigation logic
    const handleNext = () => setStartIndex(prev => Math.min(logs.length - PAGE_SIZE, prev + 2));
    const handlePrev = () => setStartIndex(prev => Math.max(0, prev - 2));

    const visibleLogs = logs.slice(startIndex, startIndex + PAGE_SIZE);
    const prices = visibleLogs.map(l => l.price);

    // Safety check for range to avoid division by zero
    const maxVal = Math.max(...prices, stateAverage);
    const minVal = Math.min(...prices, stateAverage);
    const range = (maxVal - minVal) || 20; // Default to 20 if range is 0
    const padding = range * 0.15;

    const maxPrice = maxVal + padding;
    const minPrice = minVal - padding;
    const finalRange = maxPrice - minPrice;

    const dataPoints = useMemo(() => visibleLogs.map((log, i) => {
        const x = visibleLogs.length > 1
            ? (i / (visibleLogs.length - 1)) * 100
            : 50; // Center if only one point
        return {
            x,
            y: 100 - ((log.price - minPrice) / finalRange) * 100,
            price: log.price,
            date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        };
    }), [visibleLogs, minPrice, finalRange]);

    // Cubic Bezier path generator
    const linePath = useMemo(() => {
        if (dataPoints.length < 2) {
            // If only one point, draw a short horizontal line centered
            if (dataPoints.length === 1) {
                return `M 40,${dataPoints[0].y} L 60,${dataPoints[0].y}`;
            }
            return "";
        }
        let path = `M ${dataPoints[0].x},${dataPoints[0].y}`;
        for (let i = 0; i < dataPoints.length - 1; i++) {
            const p0 = dataPoints[i];
            const p1 = dataPoints[i + 1];
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            path += ` C ${cp1x},${p0.y} ${cp1x},${p1.y} ${p1.x},${p1.y}`;
        }
        return path;
    }, [dataPoints]);

    const areaPath = dataPoints.length > 1
        ? `${linePath} L 100,105 L 0,105 Z`
        : "";

    const stateAvgY = 100 - ((stateAverage - minPrice) / finalRange) * 100;

    // Only show Markers if we have enough points and meaningful variance
    const showMarkers = visibleLogs.length > 2 && (maxVal - minVal > 2);
    const highPoint = showMarkers ? dataPoints.reduce((max, p) => p.price > max.price ? p : max, dataPoints[0]) : null;
    const lowPoint = showMarkers ? dataPoints.reduce((min, p) => p.price < min.price ? p : min, dataPoints[0]) : null;

    return (
        <div className={styles.chartArea} style={{ position: 'relative', overflow: 'hidden' }}>
            <div className={styles.sectionHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Market Price Analytics</h2>
                        <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>30-Day performance window</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={handlePrev}
                            disabled={startIndex === 0}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: startIndex === 0 ? 'rgba(255,255,255,0.2)' : 'white',
                                padding: '6px',
                                borderRadius: '8px',
                                cursor: startIndex === 0 ? 'default' : 'pointer'
                            }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={startIndex >= logs.length - PAGE_SIZE}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: startIndex >= logs.length - PAGE_SIZE ? 'rgba(255,255,255,0.2)' : 'white',
                                padding: '6px',
                                borderRadius: '8px',
                                cursor: startIndex >= logs.length - PAGE_SIZE ? 'default' : 'pointer'
                            }}
                        >
                            <ChevronRight size={18} />
                        </button>
                        <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--primary)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginLeft: '8px' }}>
                            LIVE TREND
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={styles.placeholderChart}
                style={{
                    padding: '40px 0px 40px 0px',
                    display: 'block',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.5) 100%)',
                    height: '320px',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    marginTop: '20px'
                }}
                onMouseLeave={() => setHoveredPoint(null)}
            >
                <svg
                    viewBox="0 -5 100 110"
                    preserveAspectRatio="none"
                    style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                        </linearGradient>

                        <pattern id="dotPattern" x="0" y="0" width="10" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="0.5" cy="0.5" r="0.2" fill="rgba(255,255,255,0.1)" />
                        </pattern>

                        <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Background Grid */}
                    <rect width="100" height="100" fill="url(#dotPattern)" />
                    {[0, 25, 50, 75, 100].map(val => (
                        <line key={`grid-${val}`} x1="0" y1={val} x2="100" y2={val} stroke="rgba(255,255,255,0.05)" strokeWidth="0.1" />
                    ))}

                    {/* State Average Line */}
                    <line x1="0" y1={stateAvgY} x2="100" y2={stateAvgY} stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="1,1" />
                    <text x="1" y={stateAvgY - 2} fill="#f59e0b" style={{ fontSize: '2.5px', fontWeight: 600 }}>OYO AVG: ₦{stateAverage}</text>

                    {/* Data Line & Area */}
                    <AnimatePresence mode="wait">
                        <motion.g key={startIndex}>
                            {areaPath && (
                                <motion.path
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    d={areaPath}
                                    fill="url(#chartGradient)"
                                />
                            )}
                            <motion.path
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.8 }}
                                d={linePath}
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                style={{ filter: 'url(#lineGlow)' }}
                            />
                        </motion.g>
                    </AnimatePresence>

                    {/* Markers */}
                    {highPoint && (
                        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={`high-${startIndex}`}>
                            <circle cx={highPoint.x} cy={highPoint.y} r="2" fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="0.1" />
                            <text x={highPoint.x} y={highPoint.y - 4} fill="#22c55e" textAnchor="middle" style={{ fontSize: '2.2px', fontWeight: 800 }}>PEAK</text>
                        </motion.g>
                    )}

                    {/* Hover Interaction Layer */}
                    <rect width="100" height="100" fill="transparent" onMouseMove={(e) => {
                        const bounds = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - bounds.left) / bounds.width) * 100;
                        const closest = dataPoints.reduce((prev, curr, idx) =>
                            Math.abs(curr.x - x) < Math.abs(dataPoints[prev].x - x) ? idx : prev, 0);
                        setHoveredPoint(closest);
                    }} />

                    {/* Active Point Indicator */}
                    {hoveredPoint !== null && (
                        <g>
                            <line x1={dataPoints[hoveredPoint].x} y1="0" x2={dataPoints[hoveredPoint].x} y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
                            <circle cx={dataPoints[hoveredPoint].x} cy={dataPoints[hoveredPoint].y} r="1.5" fill="var(--primary)" stroke="#fff" strokeWidth="0.4" />
                        </g>
                    )}
                </svg>

                {/* Tooltip */}
                <AnimatePresence>
                    {hoveredPoint !== null && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                position: 'absolute',
                                left: `${dataPoints[hoveredPoint].x}%`,
                                top: `${dataPoints[hoveredPoint].y}%`,
                                transform: 'translate(-50%, -120%)',
                                background: 'rgba(20, 20, 25, 0.9)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid var(--primary)',
                                padding: '6px 12px',
                                borderRadius: '10px',
                                zIndex: 50,
                                pointerEvents: 'none'
                            }}
                        >
                            <div style={{ fontSize: '0.6rem', opacity: 0.6, textTransform: 'uppercase' }}>{dataPoints[hoveredPoint].date}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>₦{dataPoints[hoveredPoint].price}</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: '20px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{visibleLogs[0].date}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{visibleLogs[visibleLogs.length - 1].date}</span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Your Price</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '0', borderTop: '2px dashed #f59e0b' }}></div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>State Avg</span>
                    </div>
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                    Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, logs.length)} of {logs.length} updates
                </div>
            </div>
        </div>
    );
}

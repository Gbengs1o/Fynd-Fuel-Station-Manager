'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Logo } from '@/components/Icons';
import { MapPin, Camera, Upload, Check, Search, AlertCircle } from 'lucide-react';

export default function Register() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Station Discovery State
    const [nearbyStations, setNearbyStations] = useState<any[]>([]);
    const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
    const [isFindingStations, setIsFindingStations] = useState(false);

    // Photo Verification State
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const router = useRouter();
    const supabase = createClient();

    const [user, setUser] = useState<any>(null);

    // Check for existing session
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                setEmail(user.email || '');
                // Try to parse name from metadata if available
                if (user.user_metadata?.full_name) {
                    const names = user.user_metadata.full_name.split(' ');
                    if (names.length > 0) setFirstName(names[0]);
                    if (names.length > 1) setLastName(names.slice(1).join(' '));
                }
            }
        };
        checkUser();
    }, []);

    const findNearbyStations = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setIsFindingStations(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    // Call nearby_stations RPC
                    const { data, error: rpcError } = await supabase.rpc('nearby_stations', {
                        user_lat: latitude,
                        user_lon: longitude,
                        search_radius_meters: 10000 // Increase to 10km for better coverage
                    });

                    if (rpcError) throw rpcError;

                    if (data && data.length > 0) {
                        setNearbyStations(data);
                    } else {
                        setError('No stations found within 5km of your location.');
                    }
                } catch (err: any) {
                    setError('Failed to fetch nearby stations. Please try again.');
                    console.error('Registration/Discovery Error:', err);
                } finally {
                    setIsFindingStations(false);
                }
            },
            (err) => {
                setError('Location access denied. Please enable location to find your station.');
                setIsFindingStations(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStationId) {
            setError('Please find and select your station first.');
            return;
        }

        if (!photoFile) {
            setError('Please upload a photo of your station\'s price board for verification.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let userId = user?.id;

            // 1. Sign up the user (ONLY if not already logged in)
            if (!userId) {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: `${firstName} ${lastName}`,
                        }
                    }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error('No user data returned');
                userId = authData.user.id;
            }

            // 2. Upload Verification Photo
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${userId}_${Date.now()}.${fileExt}`;
            const filePath = `verification/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('verification_photos')
                .upload(filePath, photoFile);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('verification_photos')
                .getPublicUrl(filePath);

            // 3. Create Manager Profile linked to Station
            const { error: managerError } = await supabase
                .from('manager_profiles')
                .insert({
                    id: userId,
                    full_name: `${firstName} ${lastName}`,
                    phone_number: phoneNumber,
                    station_id: selectedStationId,
                    verification_photo_url: publicUrl,
                    verification_status: 'pending' // Default to pending
                });

            if (managerError) throw managerError;

            // 4. Redirect to pending verification page
            router.push('/register/pending');

        } catch (err: any) {
            setError(err.message || 'An error occurred during registration');
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '6rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div style={{ width: '100%', maxWidth: '550px', padding: '2.5rem', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <Logo style={{ width: '50px', height: '50px', color: 'var(--primary)' }} />
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', textAlign: 'center' }}>
                    {user ? 'Complete Your Profile' : 'Manager Registration'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    {user ? 'Link your account to a station to verify ownership' : 'Verify your identity and station ownership'}
                </p>

                {error && (
                    <div style={{ background: 'rgba(255, 68, 68, 0.08)', color: '#ff4444', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Step 1: Personal Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>First Name</label>
                            <input
                                type="text"
                                placeholder="Manager First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Last Name</label>
                            <input
                                type="text"
                                placeholder="Surname"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Phone Number</label>
                            <input
                                type="tel"
                                placeholder="+234..."
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Official Email</label>
                            <input
                                type="email"
                                placeholder="work@station.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                                required
                                disabled={!!user} // Disable if logged in
                            />
                        </div>
                    </div>

                    {/* Step 2: Station Discovery */}
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>SELECT YOUR STATION</label>
                            <button
                                type="button"
                                onClick={findNearbyStations}
                                disabled={isFindingStations}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <MapPin size={14} />
                                {isFindingStations ? 'Finding...' : 'Find Near Me'}
                            </button>
                        </div>

                        {nearbyStations.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                                {nearbyStations.map((station) => (
                                    <div
                                        key={station.id}
                                        onClick={() => setSelectedStationId(station.id)}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: `1px solid ${selectedStationId === station.id ? 'var(--primary)' : 'var(--border)'}`,
                                            background: selectedStationId === station.id ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div>
                                            <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>{station.name}</p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{station.address}</p>
                                        </div>
                                        {selectedStationId === station.id && <Check size={16} color="var(--primary)" />}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                                <Search size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                <p>Use "Find Near Me" to locate your station on the map.</p>
                            </div>
                        )}
                    </div>

                    {/* Step 3: Photo Verification */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Station Evidence (Price Board Photo)</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: '100%',
                                height: '120px',
                                border: '2px dashed var(--border)',
                                borderRadius: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                background: photoPreview ? `url(${photoPreview}) center/cover` : 'var(--surface)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {!photoPreview && (
                                <>
                                    <Camera size={24} color="var(--text-secondary)" />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Click to take/upload photo</span>
                                </>
                            )}
                            {photoPreview && (
                                <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Upload size={20} color="white" />
                                    <span style={{ color: 'white', marginLeft: '8px', fontSize: '0.75rem', fontWeight: '600' }}>Change Photo</span>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoChange}
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                        />
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} />
                            Must be a real-time photo of your station's digital price board.
                        </p>
                    </div>

                    {!user && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Create Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem', borderRadius: '16px', fontWeight: '700' }} disabled={loading}>
                        {loading ? 'Submitting Application...' : 'Next: Verification Review'}
                    </button>
                </form>

                <p style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Login here</Link>
                </p>
            </div>
        </div>
    );
}

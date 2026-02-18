'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateStationPrices(formData: FormData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Get manager's station
    const { data: profile } = await supabase
        .from('manager_profiles')
        .select('station_id')
        .eq('id', user.id)
        .single();

    if (!profile?.station_id) throw new Error('No station associated');

    const stationId = profile.station_id;
    const pms = parseFloat(formData.get('pms') as string);
    const ago = parseFloat(formData.get('ago') as string);
    const dpk = parseFloat(formData.get('dpk') as string);

    // Fetch old prices for logging
    const { data: oldStation } = await supabase
        .from('stations')
        .select('price_pms, price_ago, price_dpk')
        .eq('id', stationId)
        .single();

    // Update station
    const { error: updateError } = await supabase
        .from('stations')
        .update({
            price_pms: pms,
            price_ago: ago,
            price_dpk: dpk,
            updated_at: new Date().toISOString()
        })
        .eq('id', stationId);

    if (updateError) throw updateError;

    // Log changes
    const logs = [];
    if (oldStation?.price_pms !== pms) {
        logs.push({ station_id: stationId, fuel_type: 'pms', old_price: oldStation?.price_pms, new_price: pms, updated_by: user.id });
    }
    if (oldStation?.price_ago !== ago) {
        logs.push({ station_id: stationId, fuel_type: 'ago', old_price: oldStation?.price_ago, new_price: ago, updated_by: user.id });
    }
    if (oldStation?.price_dpk !== dpk) {
        logs.push({ station_id: stationId, fuel_type: 'dpk', old_price: oldStation?.price_dpk, new_price: dpk, updated_by: user.id });
    }

    if (logs.length > 0) {
        await supabase.from('price_logs').insert(logs);
    }

    revalidatePath('/dashboard/pricing');
    revalidatePath('/dashboard');

    return { success: true };
}

export async function getStationDetails(stationId: number) {
    const supabase = await createClient();

    const { data: station, error: stationError } = await supabase
        .from('stations')
        .select('*')
        .eq('id', stationId)
        .single();

    if (stationError) throw stationError;

    // Fetch manager if exists
    const { data: manager } = await supabase
        .from('manager_profiles')
        .select('full_name, phone_number')
        .eq('station_id', stationId)
        .single();

    return {
        ...station,
        manager: manager || null
    };
}

export async function updateSinglePrice(fuelType: string, newPrice: number) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Get manager's station
    const { data: profile } = await supabase
        .from('manager_profiles')
        .select('station_id')
        .eq('id', user.id)
        .single();

    if (!profile?.station_id) throw new Error('No station associated');

    const stationId = profile.station_id;
    const updateKey = `price_${fuelType.toLowerCase()}`;

    // Fetch old prices for logging
    const { data: oldStation } = await supabase
        .from('stations')
        .select(updateKey)
        .eq('id', stationId)
        .single();

    // Update station
    const { error: updateError } = await supabase
        .from('stations')
        .update({
            [updateKey]: newPrice,
            updated_at: new Date().toISOString()
        })
        .eq('id', stationId);

    if (updateError) throw updateError;

    // Log changes
    await supabase.from('price_logs').insert({
        station_id: stationId,
        fuel_type: fuelType.toLowerCase(),
        old_price: (oldStation as any)?.[updateKey],
        new_price: newPrice,
        updated_by: user.id
    });

    revalidatePath('/dashboard/pricing');
    revalidatePath('/dashboard');

    return { success: true };
}

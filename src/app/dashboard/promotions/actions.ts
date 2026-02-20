'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getWalletInfo() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', user.id)
        .single();

    if (walletError) throw walletError;

    const { data: transactions, error: transError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (transError) throw transError;

    return { wallet, transactions };
}

export async function getActivePromotion(stationId: number) {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('station_promotions')
        .select('*, tier:tier_id(*)')
        .eq('station_id', stationId)
        .eq('status', 'active')
        .gt('end_time', now)
        .maybeSingle();

    if (error) {
        console.error('Error fetching active promotion:', error);
        return null;
    }
    return data;
}

export async function getCampaignHistory(stationId: number) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('station_promotions')
        .select('*, tier:tier_id(*)')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching campaign history:', error);
        return [];
    }
    return data;
}

export async function getPromotionTiers() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('promotion_tiers')
        .select('*')
        .order('price', { ascending: true });

    if (error) throw error;
    return data;
}

export async function activatePromotion(stationId: number, tierId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // 1. Fetch Tier details
    const { data: tier, error: tierError } = await supabase
        .from('promotion_tiers')
        .select('*')
        .eq('id', tierId)
        .single();

    if (tierError) throw tierError;

    // 2. Check Wallet Balance
    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', user.id)
        .single();

    if (walletError) throw walletError;
    if (wallet.balance < tier.price) {
        throw new Error('Insufficient funds in wallet');
    }

    // 3. Execution (Transaction)
    // We deduct balance and create elevation in a single transaction-like flow 
    // note: Supabase client doesn't support easy multi-table transactions in JS, 
    // often better to use an RPC for this, but for now we'll do sequential checks 
    // and rely on the RLS/Database constraints (balance >= 0) to prevent overdrafts.

    const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - tier.price })
        .eq('id', user.id);

    if (deductError) throw deductError;

    // Record the spending
    await supabase.from('wallet_transactions').insert({
        wallet_id: user.id,
        amount: -tier.price,
        type: 'spending',
        metadata: { promotion_tier: tier.name, station_id: stationId }
    });

    // Activate the promotion
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + tier.duration_hours);

    const { error: promoError } = await supabase
        .from('station_promotions')
        .insert({
            station_id: stationId,
            tier_id: tierId,
            user_id: user.id,
            end_time: endTime.toISOString(),
            status: 'active'
        });

    if (promoError) throw promoError;

    revalidatePath('/dashboard/promotions');
    return { success: true };
}

export async function mockTopUp(amount: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', user.id)
        .single();

    if (walletError) throw walletError;

    const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance + amount })
        .eq('id', user.id);

    if (updateError) throw updateError;

    await supabase.from('wallet_transactions').insert({
        wallet_id: user.id,
        amount: amount,
        type: 'deposit',
        metadata: { method: 'mock_payment' }
    });

    revalidatePath('/dashboard/promotions');
    return { success: true };
}

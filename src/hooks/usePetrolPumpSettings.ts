/**
 * Petrol Pump Settings hook
 * Manages the universal diesel selling price per liter
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { PetrolPumpSettings } from '../types/database';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export function usePetrolPumpSettings() {
  const [settings, setSettings] = useState<PetrolPumpSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('petrol_pump_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();

      if (fetchError) throw fetchError;

      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch petrol pump settings');
    } finally {
      setLoading(false);
    }
  }

  async function updateSettings(updates: Partial<Pick<PetrolPumpSettings, 'diesel_selling_price_per_litre' | 'notes'>>) {
    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('petrol_pump_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', SETTINGS_ID)
        .select()
        .single();

      if (updateError) throw updateError;

      setSettings(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update petrol pump settings');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Update the universal diesel selling price per liter
   */
  async function updateDieselSellingPrice(pricePerLitre: number, notes?: string) {
    if (pricePerLitre < 0) {
      throw new Error('Diesel selling price cannot be negative');
    }
    
    return updateSettings({
      diesel_selling_price_per_litre: pricePerLitre,
      notes: notes || `Updated diesel selling price to Rs. ${pricePerLitre.toFixed(2)}/L`,
    });
  }

  return { 
    settings, 
    loading, 
    error, 
    refetch: fetchSettings,
    updateSettings,
    updateDieselSellingPrice,
  };
}

/**
 * Get the current universal diesel selling price per liter
 * Returns 0 if settings are not loaded or unavailable
 */
export async function getUniversalDieselSellingPrice(): Promise<number> {
  const { data, error } = await supabase
    .from('petrol_pump_settings')
    .select('diesel_selling_price_per_litre')
    .eq('id', SETTINGS_ID)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.diesel_selling_price_per_litre;
}

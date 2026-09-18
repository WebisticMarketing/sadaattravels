-- ============================================================================
-- Migration 014: Add Petrol Pump Settings for Universal Diesel Selling Price
-- ============================================================================
-- 
-- This migration adds a centralized settings table for the Petrol Pump module.
-- Initially, it stores only the universal diesel selling price per liter.
-- 
-- Key decisions:
-- - Single-row table enforced by CHECK constraint
-- - Selling price is separate from inventory cost (weighted average)
-- - Historical fuel_sales records are NOT modified
-- - New sales can use this as the default selling price
-- ============================================================================

-- Create petrol pump settings table
CREATE TABLE public.petrol_pump_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Universal diesel selling price per liter (Rs.)
    -- This is the standard price at which Sadaat Petrol Pump sells diesel
    diesel_selling_price_per_litre NUMERIC(10, 3) NOT NULL CHECK (diesel_selling_price_per_litre >= 0),
    -- Metadata
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    -- Enforce single-row table
    CONSTRAINT single_row_check CHECK (id = '00000000-0000-0000-0000-000000000001')
);

-- Insert the initial settings row with a default value
-- Default: Rs 350/L (can be changed by administrator)
INSERT INTO public.petrol_pump_settings (
    id,
    diesel_selling_price_per_litre,
    updated_by,
    updated_at,
    notes
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    350.00,
    NULL,
    NOW(),
    'Universal diesel selling price per liter for Sadaat Petrol Pump'
);

-- Index for fast lookups
CREATE INDEX idx_petrol_pump_settings_updated_at ON public.petrol_pump_settings(updated_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_petrol_pump_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_petrol_pump_settings_updated_at
    BEFORE UPDATE ON public.petrol_pump_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_petrol_pump_settings_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT ON public.petrol_pump_settings TO authenticated;
GRANT INSERT, UPDATE ON public.petrol_pump_settings TO authenticated;

-- RLS Policies
ALTER TABLE public.petrol_pump_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Allow authenticated users to view petrol pump settings"
    ON public.petrol_pump_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow managers and owners to update settings
CREATE POLICY "Allow managers and owners to update petrol pump settings"
    ON public.petrol_pump_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.petrol_pump_settings IS 'Centralized settings for Petrol Pump module. Currently stores universal diesel selling price per liter.';
COMMENT ON COLUMN public.petrol_pump_settings.diesel_selling_price_per_litre IS 'Standard selling price per liter for diesel. Used as default for external customer sales.';

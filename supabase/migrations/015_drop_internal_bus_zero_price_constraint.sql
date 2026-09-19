-- Migration 015: Drop constraint preventing non-zero sale price for INTERNAL_BUS
-- Date: 2026
--
-- This migration enables the new accounting model where internal bus fuel sales
-- use the universal diesel selling price and generate Petrol Pump revenue.
--
-- IMPORTANT: This migration does NOT modify existing fuel_sales records.
-- Historical data is preserved exactly as stored.

-- Drop the constraint that forced sale_price_per_litre = 0 for INTERNAL_BUS
ALTER TABLE public.fuel_sales
DROP CONSTRAINT IF EXISTS chk_internal_fuel_zero_price;

-- Update column comment to reflect new behavior
COMMENT ON COLUMN public.fuel_sales.sale_price_per_litre IS 
'Selling price per litre at time of sale. For INTERNAL_BUS, stores the universal diesel price at time of sale. For EXTERNAL_CUSTOMER, stores the customer selling price. Historical records preserve their original price.';

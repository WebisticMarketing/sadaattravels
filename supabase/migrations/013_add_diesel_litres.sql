-- Add diesel_litres column to trip_expenses table
-- This stores the physical quantity of diesel for the trip/voucher
-- Required for Petrol Pump workflow to track fuel movement vs financial payment

ALTER TABLE public.trip_expenses
ADD COLUMN diesel_litres NUMERIC(10, 3) CHECK (diesel_litres >= 0);

-- Add comment to document the purpose
COMMENT ON COLUMN public.trip_expenses.diesel_litres IS 
'Physical quantity of diesel (in litres) for this trip. Required when expense_type=diesel. Used by Petrol Pump module to track fuel movement.';

-- Note: This column is primarily used when expense_type = 'diesel'
-- For other expense types, this column remains NULL

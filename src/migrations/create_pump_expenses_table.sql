-- Create pump_expenses table following trip_expenses/adda_expenses patterns
CREATE TABLE IF NOT EXISTS public.pump_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('ELECTRICITY', 'STAFF_SALARY', 'PUMP_REPAIR', 'GENERATOR', 'CLEANING', 'EQUIPMENT', 'OTHER')),
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_to TEXT,
  receipt_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reversed', 'cancelled')),
  reversed_by UUID REFERENCES auth.users(id),
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pump_expenses_date ON public.pump_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_pump_expenses_status ON public.pump_expenses(status);
CREATE INDEX IF NOT EXISTS idx_pump_expenses_type ON public.pump_expenses(expense_type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pump_expenses ENABLE ROW LEVEL SECURITY;

-- Policies (matching existing patterns)
CREATE POLICY "Users can view pump expenses"
  ON public.pump_expenses FOR SELECT
  USING (true);

CREATE POLICY "Users can insert pump expenses"
  ON public.pump_expenses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update pump expenses"
  ON public.pump_expenses FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete pump expenses"
  ON public.pump_expenses FOR DELETE
  USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pump_expenses_updated_at
  BEFORE UPDATE ON public.pump_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

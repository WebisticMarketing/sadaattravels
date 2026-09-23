/**
 * React binding for the shared company accounting engine.
 *
 * The pure engine lives in src/lib/companyAccounting.ts (no React, no
 * Supabase client instantiation). This thin hook is the ONLY way pages
 * consume company-wide accounting — Dashboard and Main Reports both go
 * through it, guaranteeing identical totals for identical periods.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import { loadCompanyAccounting } from '../lib/companyAccounting';
import type { AccountingPeriod, CompanyAccountingResult } from '../lib/companyAccounting';

export function useCompanyAccounting(period: AccountingPeriod) {
  const [result, setResult] = useState<CompanyAccountingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadCompanyAccounting(supabase, period)
      .then(r => {
        if (!cancelled) {
          setResult(r);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          logError(err, 'useCompanyAccounting');
          setError(err instanceof Error ? err.message : 'Failed to load company accounting');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.start, period.end]);

  return { result, loading, error };
}

export type { AccountingPeriod, CompanyAccountingResult };

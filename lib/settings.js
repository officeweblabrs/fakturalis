'use client';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const DEFAULTS = {
  business_name: '',
  owner_name: '',
  address: '',
  tax_id: '',
  reg_no: '',
  activity_code: '',
  email: '',
  phone: '',
  bank_account: '',
  payment_code: '221',
  payment_info: '',
  invoice_note:
    'Obveznik nije u sistemu PDV-a. PDV nije obračunat u skladu sa članom 33. Zakona o PDV.',
  due_days: 15,
  limit1: 6000000,
  limit2: 8000000,
  // month: null = svakog meseca
  reminders: [
    { label: 'Uplata doprinosa i poreza', day: 15, month: null },
    { label: 'Godišnja poreska prijava (PPP-PO)', day: 15, month: 5 },
  ],
};

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('settings')
      .select('data')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings({ ...DEFAULTS, ...data.data });
        setLoaded(true);
      });
  }, []);

  const save = async (next) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from('settings').upsert({ user_id: user.id, data: next });
    if (!error) setSettings(next);
    return error;
  };

  return { settings, loaded, save };
}

import { createClient } from '@supabase/supabase-js';

// Rezervne vrednosti postoje samo da build ne pukne bez env promenljivih.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

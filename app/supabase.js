import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Mesti sama tepat dengan nama jadual di Supabase
export const TABLE_NAME = 'Ahli Lembaga Pengarah JLB';

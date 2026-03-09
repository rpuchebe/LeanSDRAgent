import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgucfqabqjqzkrrkcxxl.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YZZFlZlOSEEkm-hDPDOaEg_AjG0-kiz';

export const supabase = createClient(supabaseUrl, supabaseKey);

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser-only client: authentication state is stored and refreshed here.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

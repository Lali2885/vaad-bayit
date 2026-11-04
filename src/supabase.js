import { createClient } from '@supabase/supabase-js';

// בקובץ התצוגה המקדימה (מצב הדגמה) אין כתובת שרת - כתובת דמה, ושום קריאה לא נשלחת
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://demo.invalid',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo',
  {
    auth: { persistSession: true, autoRefreshToken: true },
    global: {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    }
  }
);

export async function testConnection() {
  const { data, error } = await supabase.from('app_tenants').select('user_id').limit(1);
  return { data, error };
}

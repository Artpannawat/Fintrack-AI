import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'fintrack-auth-key',
    // Bypass Zone.js Web Locks conflict in Angular dev mode
    lock: ((_name: string, _timeout: number, fn: () => Promise<any>) => fn()) as any
  }
});

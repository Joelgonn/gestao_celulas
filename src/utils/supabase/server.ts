import { createServerClient as createClientSSR, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

// =========================================================================================
// CLIENTE PARA SERVER COMPONENTS / SERVER ACTIONS (COM CONTEXTO DE USUÁRIO)
// =========================================================================================
export const createServerClient = () => {
  return createClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // CORREÇÃO: O método agora é 'async'
        async get(name: string) {
          // CORREÇÃO: Usamos 'await' para resolver a Promise
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        // CORREÇÃO: O método agora é 'async'
        async set(name: string, value: string, options: CookieOptions) {
          try {
            // CORREÇÃO: Usamos 'await' para resolver a Promise
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn('createServerClient: Could not set cookie in Server Action/Component context:', error);
          }
        },
        // CORREÇÃO: O método agora é 'async'
        async remove(name: string, options: CookieOptions) {
          try {
            // CORREÇÃO: Usamos 'await' para resolver a Promise
            const cookieStore = await cookies();
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.warn('createServerClient: Could not remove cookie in Server Action/Component context:', error);
          }
        },
      },
    }
  );
};


// =========================================================================================
// CLIENTE PARA ADMIN (SERVICE_ROLE_KEY - SEM CONTEXTO DE USUÁRIO)
// =========================================================================================
export const createAdminClient = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing environment variable SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
};
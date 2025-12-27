// src/utils/supabase/server.ts

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
        async get(name: string) {
          try {
            // CORREÇÃO: Usar await para resolver a Promise retornada por cookies()
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value;
          } catch (error) {
            console.warn('createServerClient: Could not get cookie (expected in some dev scenarios or if headers are unavailable):', error);
            return undefined;
          }
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            // CORREÇÃO: Usar await para resolver a Promise retornada por cookies()
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn('createServerClient: Could not set cookie (expected in some dev scenarios or if headers are unavailable):', error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            // CORREÇÃO: Usar await para resolver a Promise retornada por cookies()
            const cookieStore = await cookies();
            cookieStore.set({ name, value: '', ...options }); // Definir para vazio ou expirar para remover
          } catch (error) {
            console.warn('createServerClient: Could not remove cookie (expected in some dev scenarios or if headers are unavailable):', error);
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
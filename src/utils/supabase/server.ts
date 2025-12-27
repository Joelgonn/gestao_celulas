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
            const cookieStore = cookies();
            return cookieStore.get(name)?.value;
          } catch (error) {
            // Este erro é esperado em contextos como Fast Refresh em dev,
            // onde cookies() pode não estar disponível em todos os Server Components/Actions
            // Se o erro for persistente em produção, pode indicar um problema de ambiente.
            console.warn('createServerClient: Could not get cookie in Server Action/Component context (expected in some dev scenarios):', error);
            return undefined; // Retorna undefined para indicar que o cookie não foi obtido
          }
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = cookies();
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn('createServerClient: Could not set cookie in Server Action/Component context (expected in some dev scenarios):', error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = cookies();
            cookieStore.set({ name, value: '', ...options }); // Definir para vazio ou expirar para remover
          } catch (error) {
            console.warn('createServerClient: Could not remove cookie in Server Action/Component context (expected in some dev scenarios):', error);
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
      persistSession: false, // Não persiste sessão, pois usa service_role_key
    },
  });
};
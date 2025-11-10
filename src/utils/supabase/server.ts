import { createServerClient as createClientSSR, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

// =========================================================================================
// CLIENTE PARA SERVER COMPONENTS / SERVER ACTIONS (COM CONTEXTO DE USUÁRIO)
// =========================================================================================
export const createServerClient = () => {
  // Com Next.js 16.x e React 19.x (versões experimentais), a tipagem de `cookies()`
  // pode estar indicando um retorno de Promise<ReadonlyRequestCookies>.
  // Para acomodar essa tipagem, usamos 'await' para garantir que obtemos o objeto de cookies.
  // Note que, em versões estáveis do Next.js 13/14, `cookies()` é geralmente síncrono.
  // Esta abordagem com 'await' garante compatibilidade se a API realmente retornar uma Promise.

  return createClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          // A função cookies() de 'next/headers' é chamada.
          // O TypeScript do seu ambiente está inferindo-a como retornando uma Promise.
          const cookieStorePromise = cookies();
          const cookieStore = await cookieStorePromise; // Aguardamos a Promise para obter o objeto ReadonlyRequestCookies
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStorePromise = cookies();
            const cookieStore = await cookieStorePromise; // Aguardamos a Promise
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Este erro é esperado se tentar definir um cookie fora de um Server Component ou Server Action,
            // ou se for um Edge Runtime, onde cookies().set() não é permitido diretamente.
            // Em ambientes de desenvolvimento com Fast Refresh, também pode haver comportamentos inesperados.
            console.warn('createServerClient: Could not set cookie in Server Action/Component context:', error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStorePromise = cookies();
            const cookieStore = await cookieStorePromise; // Aguardamos a Promise
            cookieStore.set({ name, value: '', ...options }); // Definir para vazio ou expirar para remover
          } catch (error) {
            // Similar ao set, pode ocorrer em contextos específicos.
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
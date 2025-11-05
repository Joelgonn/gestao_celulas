// src/utils/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // CORREÇÃO AQUI: O método .get() do cookieStore é a maneira correta de acessar.
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        
        // CORREÇÃO AQUI: O método .set() deve ser chamado no cookieStore
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        
        // CORREÇÃO AQUI: O método .set() também é usado para remover, definindo o valor como vazio
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
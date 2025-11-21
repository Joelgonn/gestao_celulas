// src/utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'; // Recomendado para Next.js App Router

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cria um cliente Supabase para uso no navegador (Client Components)
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);
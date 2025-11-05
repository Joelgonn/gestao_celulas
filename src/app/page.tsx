// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
    // Redireciona o usuário diretamente para o dashboard.
    // A lógica de autenticação e redirecionamento será tratada pelo AuthLayout.
    redirect('/dashboard');
    // Este return null é apenas para satisfazer o React que espera algo ser retornado.
    return null; 
}
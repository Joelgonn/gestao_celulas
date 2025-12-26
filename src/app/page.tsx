'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        // Redireciona para o dashboard via cliente.
        // O AuthLayout lá no Dashboard vai verificar se o usuário
        // está logado. Se não estiver, ele mandará para o Login.
        router.replace('/dashboard');
    }, [router]);

    // Mostra um spinner enquanto redireciona para evitar tela branca ou piscada
    return <LoadingSpinner fullScreen />;
}
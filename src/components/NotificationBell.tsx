'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { contarInscricoesPendentesGlobais } from '@/lib/data';
import { FaBell } from 'react-icons/fa';

export default function NotificationBell() {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Função para buscar a contagem atualizada
    const fetchCount = async () => {
        try {
            const total = await contarInscricoesPendentesGlobais();
            setCount(total);
        } catch (error) {
            console.error("Erro ao buscar notificações:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCount();

        // Opcional: Atualizar a cada 60 segundos para manter o Tesoureiro informado em tempo real
        const intervalId = setInterval(fetchCount, 60000);
        return () => clearInterval(intervalId);
    }, []);

    // Se não tiver pendências, mostra o sino "quieto" (cinza)
    // Se tiver, mostra o sino "ativo" (com badge vermelha)
    
    return (
        <Link 
            href="/admin/financeiro/aprovacoes"
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors group"
            title="Central de Aprovações Financeiras"
        >
            <FaBell 
                className={`text-xl transition-colors ${
                    count > 0 ? 'text-gray-700 group-hover:text-emerald-600' : 'text-gray-400'
                }`} 
            />
            
            {/* Badge Vermelha (Só aparece se tiver pendências) */}
            {!loading && count > 0 && (
                <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
                    {count > 99 ? '99+' : count}
                </span>
            )}
            
            {/* Tooltip simples no hover */}
            {count > 0 && (
                <span className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg shadow-lg p-3 hidden group-hover:block z-50">
                    Você tem <strong>{count}</strong> pagamentos aguardando aprovação.
                </span>
            )}
        </Link>
    );
}
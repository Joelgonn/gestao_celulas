'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { contarInscricoesPendentesGlobais } from '@/lib/data';
import { FaBell } from 'react-icons/fa';

export default function NotificationBell() {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

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
        const intervalId = setInterval(fetchCount, 60000);
        return () => clearInterval(intervalId);
    }, []);
    
    return (
        <Link 
            href="/admin/financeiro/aprovacoes"
            className="relative p-3 rounded-full hover:bg-gray-100 transition-colors group flex items-center justify-center" 
            title="Central de Aprovações Financeiras"
        >
            <FaBell 
                className={`text-xl transition-colors ${
                    count > 0 ? 'text-gray-700 group-hover:text-emerald-600' : 'text-gray-400'
                }`} 
            />
            
            {/* AJUSTE AQUI: top-2 right-2 empurra a bolinha para dentro do ícone */}
            {!loading && count > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
                    {count > 9 ? '9+' : count}
                </span>
            )}
            
            {count > 0 && (
                <span className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg shadow-lg p-3 hidden group-hover:block z-50">
                    Você tem <strong>{count}</strong> pagamentos aguardando aprovação.
                </span>
            )}
        </Link>
    );
}
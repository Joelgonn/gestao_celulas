// src/hooks/useToast.ts
'use client';

import { useState, useCallback } from 'react'; // Importar useCallback
import { ToastProps } from '@/components/ui/Toast'; // Importa a interface do componente Toast

// Define o tipo para os toasts que serão armazenados no estado
// Omitimos 'onClose' e 'duration' aqui, pois o hook gerencia isso.
type ManagedToast = Omit<ToastProps, 'onClose' | 'duration'> & {
    id: number;
    duration?: number; // Opcional, para permitir que o toast tenha uma duração customizada ou infinita
};

// Hook para gerenciar toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<ManagedToast[]>([]);

    // Use useCallback para garantir que addToast mantenha a mesma referência
    const addToast = useCallback((message: string, type: ManagedToast['type'] = 'info', duration: number = 5000) => {
        const id = Date.now(); // Gera um ID único para cada toast
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []); // Array de dependências vazio, pois não depende de props ou estado do componente

    // Use useCallback para garantir que removeToast mantenha a mesma referência
    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []); // Array de dependências vazio

    return { toasts, addToast, removeToast };
};

export default useToast;
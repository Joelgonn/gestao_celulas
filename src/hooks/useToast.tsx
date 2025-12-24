// src/hooks/useToast.ts
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ToastProps } from '@/components/ui/Toast'; 

// Importa o componente Toast
const ToastComponent = require('@/components/ui/Toast').default; 


// Define o tipo para os toasts que serão armazenados no estado
type ManagedToast = Omit<ToastProps, 'onClose'> & {
    id: number;
};

// Hook para gerenciar toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<ManagedToast[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ManagedToast['type'] = 'info', duration: number = 5000) => {
        const id = Date.now() + Math.random(); 
        const newToast: ManagedToast = { id, message, type, duration };
        
        setToasts(prev => [...prev, newToast]);

    }, []); 

    // NOVO: useEffect para gerenciar a auto-remoção
    useEffect(() => {
        if (toasts.length === 0) return;
        
        const timer = setTimeout(() => {
            // Remove o toast que tem duração definida, ou o primeiro se a fila tiver mais de um
            const toastToRemove = toasts.find(t => t.duration !== 0) || toasts[0];
            if(toastToRemove) removeToast(toastToRemove.id);
        }, toasts[0].duration || 5000); 
        
        return () => clearTimeout(timer);
    }, [toasts, removeToast]);
    
    
    // O COMPONENTE CONTAINER QUE SERÁ RETORNADO (CORREÇÃO DE SINTAXE JSX)
    const ToastContainer = () => {
        if (toasts.length === 0) return null;
        
        // Uso de parênteses ao redor do bloco JSX para garantir que o Turbopack o veja como um retorno
        return ( 
            <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full pointer-events-none">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto"> 
                        <ToastComponent
                            message={toast.message}
                            type={toast.type}
                            duration={toast.duration}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
        );
    };

    // NOVO RETORNO: Inclui o ToastContainer
    return { addToast, removeToast, ToastContainer };
};

export default useToast;
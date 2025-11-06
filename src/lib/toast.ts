// src/lib/toast.ts
import { create } from 'zustand';

// Interface para a estrutura de um toast
export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number; // Duração opcional em milissegundos, para fechar automaticamente
}

// Interface para o estado e ações do store de toasts
interface ToastStore {
    toasts: Toast[]; // Array de toasts atualmente ativos
    // Adiciona um novo toast
    addToast: (message: string, type: Toast['type'], duration?: number) => void;
    // Remove um toast pelo seu ID
    removeToast: (id: string) => void;
}

// Cria o store de toasts usando Zustand
export const useToastStore = create<ToastStore>((set) => ({
    toasts: [], // Estado inicial: nenhum toast
    
    // Ação para adicionar um toast
    addToast: (message, type, duration = 5000) => { // 'duration' tem um valor padrão de 5000ms
        const id = Math.random().toString(36).substring(2, 9); // Gera um ID único para o toast
        const newToast: Toast = { id, message, type, duration };
        
        set((state) => ({
            toasts: [...state.toasts, newToast] // Adiciona o novo toast ao array
        }));
    },
    
    // Ação para remover um toast
    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id) // Filtra e remove o toast com o ID correspondente
        }));
    },
}));
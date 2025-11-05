// src/components/ToastContainer.tsx
'use client';

import React, { useEffect } from 'react';
import { useToastStore } from '@/lib/toast'; // Importa o hook para acessar o estado dos toasts
import { X } from 'lucide-react'; // Ícone de fechar do lucide-react (ou outro lib de ícones)

// Ícone de fechar (substitua por sua lib de ícones preferida, se tiver)
const CloseIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="ml-auto text-gray-500 hover:text-gray-700 focus:outline-none">
    <X className="h-4 w-4" />
  </button>
);

const ToastContainer: React.FC = () => {
  // Pega os toasts do store e a função para removê-los
  const { toasts, removeToast } = useToastStore();

  // Efeito para remover toasts automaticamente após um tempo
  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.duration) {
        const timer = setTimeout(() => {
          removeToast(toast.id); // Remove o toast após a duração definida
        }, toast.duration);
        return () => clearTimeout(timer); // Limpa o timer se o componente for desmontado ou os toasts mudarem
      }
    });
  }, [toasts, removeToast]); // Executa quando os toasts ou a função de remover mudam

  return (
    // Container fixo no canto inferior direito da tela
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
      <div className="flex flex-col-reverse space-y-3 space-y-reverse"> {/* Exibe os toasts mais recentes no topo */}
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`relative w-full p-4 rounded-lg shadow-lg transition-all duration-300 ease-out ${
              toast.type === 'success' ? 'bg-green-100 border-l-4 border-green-500 text-green-700' :
              toast.type === 'error' ? 'bg-red-100 border-l-4 border-red-500 text-red-700' :
              toast.type === 'warning' ? 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700' :
              'bg-gray-100 border-l-4 border-gray-500 text-gray-700' // Default
            } `}
            role="alert"
          >
            <div className="flex items-center">
              {/* Título/Tipo do Toast */}
              <span className="font-semibold mr-2 uppercase text-sm">
                {toast.type}
              </span>
              {/* Ícone de Fechar */}
              <CloseIcon onClick={() => removeToast(toast.id)} />
            </div>
            {/* Mensagem do Toast */}
            <p className="text-sm mt-2">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
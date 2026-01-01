'use client';

import React, { useEffect } from 'react';
import { FaExclamationTriangle, FaTrash, FaKey, FaTimes } from 'react-icons/fa';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}) => {
  // Fecha o modal ao pressionar Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Definimos os tamanhos diretamente aqui para evitar erros de tipagem com cloneElement
  const themes = {
    danger: {
      icon: <FaTrash size={28} className="text-red-600" />,
      bgIcon: 'bg-red-100',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      accent: 'border-red-500',
    },
    warning: {
      icon: <FaExclamationTriangle size={28} className="text-amber-600" />,
      bgIcon: 'bg-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
      accent: 'border-amber-500',
    },
    info: {
      icon: <FaKey size={28} className="text-indigo-600" />,
      bgIcon: 'bg-indigo-100',
      button: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
      accent: 'border-indigo-500',
    },
  };

  const currentTheme = themes[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop com desfoque */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={loading ? undefined : onClose}
      />

      {/* Modal Card */}
      <div className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl transform animate-in zoom-in-95 duration-200 border-t-8 ${currentTheme.accent}`}>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          disabled={loading}
        >
          <FaTimes size={18} />
        </button>

        <div className="p-8">
          {/* Icon Header */}
          <div className={`w-16 h-16 ${currentTheme.bgIcon} rounded-2xl flex items-center justify-center mb-6 mx-auto transform -rotate-3`}>
            {currentTheme.icon}
          </div>

          <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold text-gray-900 leading-tight">
              {title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed text-pretty">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-6 py-3.5 text-sm font-bold text-white rounded-2xl shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${currentTheme.button}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
// src/components/LoadingSpinner.tsx
import React from 'react';

// Expandindo as cores para aceitar strings genéricas (para compatibilidade com classes Tailwind diretas)
// ou mantendo o mapeamento estrito se preferir.
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  // Aceita as cores pré-definidas OU qualquer string (para passar classes como 'text-white')
  color?: 'indigo' | 'green' | 'blue' | 'purple' | 'red' | 'gray' | 'white' | string;
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string; // Adicionado para classes extras
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'indigo', 
  text, 
  fullScreen = false, // Mudado padrão para false para evitar ocupar tela inteira acidentalmente em componentes menores
  overlay = false,
  className = ''
}) => {
  // Tamanhos do spinner
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
    xl: 'h-24 w-24 border-4'
  };

  // Mapeamento de cores pré-definidas para classes de borda
  const colorMap: Record<string, string> = {
    indigo: 'border-indigo-500',
    green: 'border-emerald-500', // Atualizado para emerald para consistência com o app
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    red: 'border-red-500',
    gray: 'border-gray-500',
    white: 'border-white'
  };

  // Se a cor passada não estiver no mapa, assume que é uma classe CSS direta (ex: 'text-white')
  // Se for uma classe de texto, tentamos converter para borda ou usamos como está se não for mapeada
  const borderColorClass = colorMap[color] || (color.startsWith('text-') ? color.replace('text-', 'border-') : color);

  // Textos padrão baseados no contexto
  const defaultTexts = {
    sm: 'Carregando...',
    md: 'Carregando dados...',
    lg: 'Processando...',
    xl: 'Aguarde...'
  };

  const displayText = text !== undefined ? text : defaultTexts[size];

  // Container principal
  const Container = ({ children }: { children: React.ReactNode }) => {
    if (overlay) {
      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 animate-in zoom-in duration-200">
            {children}
          </div>
        </div>
      );
    }

    if (fullScreen) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/90 backdrop-blur-sm z-40 fixed inset-0">
          {children}
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        {children}
      </div>
    );
  };

  return (
    <Container>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* Spinner Fundo (track) */}
          <div className={`rounded-full border-gray-200 opacity-30 absolute inset-0 ${sizeClasses[size]}`} style={{ borderWidth: 'inherit' }}></div>
          
          {/* Spinner Principal (animado) */}
          <div className={`animate-spin rounded-full border-t-transparent border-l-transparent ${sizeClasses[size]} ${borderColorClass}`}></div>
        </div>
        
        {/* Texto de loading */}
        {displayText && (
          <div className="text-center">
            <p className="text-gray-600 font-medium text-sm animate-pulse">
              {displayText}
            </p>
          </div>
        )}
      </div>
    </Container>
  );
};

// Componente de loading inline para botões (mantido e melhorado)
export const InlineSpinner: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({ 
  size = 'sm',
  className = ''
}) => {
  const sizeClass = size === 'sm' ? 'h-4 w-4 border-[2px]' : 'h-5 w-5 border-2';
  
  return (
    <div className={`animate-spin rounded-full border-current border-t-transparent ${sizeClass} ${className}`} />
  );
};

export default LoadingSpinner;
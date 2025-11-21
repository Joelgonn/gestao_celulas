// src/components/ui/LoadingSpinner.tsx
import React from 'react';

export interface LoadingSpinnerProps { // Exportar a interface
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'indigo' | 'green' | 'blue' | 'purple' | 'red' | 'gray';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'indigo', 
  text, 
  fullScreen = true,
  overlay = false
}) => {
  // Tamanhos do spinner
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-16 w-16 border-t-4 border-b-4', // Mantido como no seu original, mas o pequeno no page.tsx era h-12 w-12
    lg: 'h-24 w-24 border-t-4 border-b-4',
    xl: 'h-32 w-32 border-t-4 border-b-4'
  };

  // Cores do spinner
  const colorClasses = {
    indigo: 'border-indigo-500',
    green: 'border-green-500',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    red: 'border-red-500',
    gray: 'border-gray-500'
  };

  // Textos padrão baseados no contexto
  const defaultTexts = {
    sm: 'Carregando...',
    md: 'Carregando dados...',
    lg: 'Processando sua solicitação...',
    xl: 'Carregando dados da sessão...'
  };

  const displayText = text || defaultTexts[size];

  // Container principal
  const Container = ({ children }: { children: React.ReactNode }) => {
    if (overlay) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 transform transition-all duration-300">
            {children}
          </div>
        </div>
      );
    }

    if (fullScreen) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          {children}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center p-8">
        {children}
      </div>
    );
  };

  return (
    <Container>
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner principal com animação suave */}
        <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} relative`}>
          {/* Efeito de brilho interno */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
        </div>
        
        {/* Texto de loading */}
        {displayText && (
          <div className="text-center space-y-2">
            <p className="text-gray-700 font-medium text-lg animate-pulse">
              {displayText}
            </p>
            {/* Pontinhos animados */}
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        {/* Mensagem adicional para tamanhos maiores */}
        {(size === 'lg' || size === 'xl') && (
          <p className="text-gray-500 text-sm text-center max-w-sm">
            Isso pode levar alguns instantes. Por favor, aguarde.
          </p>
        )}
      </div>
    </Container>
  );
};

// Componente de loading inline para uso em botões ou elementos pequenos
export const InlineSpinner: React.FC<{ size?: 'xs' | 'sm'; color?: string }> = ({ 
  size = 'xs', 
  color = 'currentColor' 
}) => {
  const sizeClasses = {
    xs: 'h-4 w-4 border',
    sm: 'h-5 w-5 border-2'
  };

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} border-current border-t-transparent`} 
         style={{ color }} />
  );
};

// Componente de loading para cards/seções
export const SectionLoader: React.FC<{ message?: string }> = ({ message = 'Carregando conteúdo...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
      <p className="text-gray-600 text-center">{message}</p>
    </div>
  );
};

// Componente de loading skeleton para carregamento de conteúdo
export const SkeletonLoader: React.FC<{ type?: 'card' | 'list' | 'text'; lines?: number }> = ({ 
  type = 'card', 
  lines = 3 
}) => {
  if (type === 'card') {
    return (
      <div className="animate-pulse bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: `${100 - (i * 10)}%` }}></div>
          ))}
        </div>
        <div className="flex space-x-2 pt-2">
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-white rounded-xl shadow">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${100 - (i * 15)}%` }}></div>
      ))}
    </div>
  );
};

export default LoadingSpinner;
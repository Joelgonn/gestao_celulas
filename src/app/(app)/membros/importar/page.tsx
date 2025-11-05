// src/app/(app)/membros/importar/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { importarMembrosCSV } from '@/lib/data';

// Sistema de Toasts
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export default function ImportarMembrosPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ rowIndex: number; data: any; error: string }[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const router = useRouter();

  // Função para adicionar toast
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);
  };

  // Função para remover toast
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      setFileName(file.name);
      setErrors([]);
      
      addToast({
        type: 'success',
        title: 'Arquivo selecionado',
        message: `${file.name} pronto para importação`,
        duration: 3000
      });
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    if (!csvFile) {
      addToast({
        type: 'error',
        title: 'Arquivo necessário',
        message: 'Por favor, selecione um arquivo CSV'
      });
      setLoading(false);
      return;
    }

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        const csvString = event.target?.result as string;
        const result = await importarMembrosCSV(csvString);

        if (result.success) {
          addToast({
            type: 'success',
            title: 'Importação concluída!',
            message: `${result.importedCount} membros importados com sucesso`,
            duration: 4000
          });

          // Redirecionar após mostrar o toast
          setTimeout(() => {
            router.push('/membros');
          }, 2000);
        } else {
          addToast({
            type: 'warning',
            title: 'Importação parcial',
            message: `${result.importedCount} sucessos, ${result.errors.length} erros`
          });
          setErrors(result.errors);
        }
        setLoading(false);
      };
      
      fileReader.onerror = () => {
        addToast({
          type: 'error',
          title: 'Erro de leitura',
          message: 'Não foi possível ler o arquivo'
        });
        setLoading(false);
      };
      
      fileReader.readAsText(csvFile);
    } catch (error: any) {
      console.error("Erro ao ler arquivo ou na importação:", error);
      addToast({
        type: 'error',
        title: 'Erro inesperado',
        message: error.message || "Erro desconhecido durante a importação"
      });
      setLoading(false);
    }
  };

  // Ícones para os toasts
  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return (
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = "max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden";
    
    switch (type) {
      case 'success':
        return `${baseStyles} border-l-4 border-green-500`;
      case 'error':
        return `${baseStyles} border-l-4 border-red-500`;
      case 'warning':
        return `${baseStyles} border-l-4 border-yellow-500`;
      case 'info':
        return `${baseStyles} border-l-4 border-blue-500`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Container de Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={getToastStyles(toast.type)}
          >
            <div className="p-4">
              <div className="flex items-start">
                {getToastIcon(toast.type)}
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">
                    {toast.title}
                  </p>
                  {toast.message && (
                    <p className="mt-1 text-sm text-gray-500">
                      {toast.message}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <span className="sr-only">Fechar</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Header com Gradiente */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Importar Membros
                </h1>
                <p className="text-green-100 mt-2">Importe membros em lote usando arquivo CSV</p>
              </div>
              <Link 
                href="/membros"
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
              </Link>
            </div>
          </div>

          {/* Formulário */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleImport} className="space-y-6">
              {/* Upload de Arquivo */}
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-green-400 transition-all duration-200">
                <label htmlFor="csvFile" className="block text-center cursor-pointer">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span className="block text-sm font-semibold text-gray-700 mb-2">
                    {fileName ? fileName : 'Selecione o arquivo CSV'}
                  </span>
                  <span className="block text-sm text-gray-500 mb-4">
                    Clique para selecionar ou arraste o arquivo
                  </span>
                  <input
                    type="file"
                    id="csvFile"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                    disabled={loading}
                  />
                  <div className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Selecionar Arquivo
                  </div>
                </label>
              </div>

              {/* Instruções */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Formato do CSV
                </h3>
                <div className="space-y-2 text-sm text-blue-700">
                  <p>O CSV deve ter os seguintes cabeçalhos (case-insensitive, ordem não importa):</p>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <code className="text-sm font-mono bg-blue-100 px-2 py-1 rounded">
                      nome, telefone, data_ingresso, data_nascimento, endereco, status
                    </code>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="font-semibold">Campos obrigatórios:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li><code className="bg-blue-100 px-1 rounded">nome</code></li>
                      <li><code className="bg-blue-100 px-1 rounded">data_ingresso</code></li>
                    </ul>
                    <p className="font-semibold mt-2">Status permitidos:</p>
                    <ul className="list-disc list-inside ml-2">
                      <li>Ativo, Inativo, Em transição</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botão de Importação */}
              <button
                type="submit"
                disabled={loading || !csvFile}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Iniciar Importação
                  </>
                )}
              </button>
            </form>

            {/* Lista de Erros */}
            {errors.length > 0 && (
              <div className="mt-8 bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                <div className="bg-red-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Erros na Importação ({errors.length})
                  </h3>
                </div>
                <div className="max-h-80 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {errors.map((err, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-semibold">
                            {err.rowIndex}
                          </div>
                          <div className="flex-1">
                            <p className="text-red-700 font-medium">{err.error}</p>
                            {err.data && (
                              <div className="mt-2 p-2 bg-gray-50 rounded border text-sm">
                                <span className="font-semibold text-gray-600">Dados:</span>
                                <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                                  {JSON.stringify(err.data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
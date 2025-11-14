// src/app/(app)/membros/importar/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { importarMembrosCSV } from '@/lib/data';

// --- REFATORAÇÃO: TOASTS ---
// Remover a implementação local de Toast e usar o hook global.
// REMOVER ESTE BLOCO:
// Sistema de Toasts
// interface Toast {
//   id: string;
//   type: 'success' | 'error' | 'warning' | 'info';
//   title: string;
//   message?: string;
//   duration?: number;
// }
// FIM DO BLOCO A SER REMOVIDO

// ADICIONAR ESTAS DUAS LINHAS:
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';

export default function ImportarMembrosPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  // REMOVER ESTA LINHA: const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ rowIndex: number; data: any; error: string }[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const router = useRouter();

  // ADICIONAR ESTA LINHA: Inicializar o hook de toast global
  const { toasts, addToast, removeToast } = useToast();

  // REMOVER ESTAS FUNÇÕES LOCAIS:
  // Função para adicionar toast
  // const addToast = (toast: Omit<Toast, 'id'>) => {
  //   const id = Math.random().toString(36).substring(2, 9);
  //   const newToast = { ...toast, id };
  //   setToasts(prev => [...prev, newToast]);
    
  //   setTimeout(() => {
  //     removeToast(id);
  //   }, toast.duration || 5000);
  // };

  // Função para remover toast
  // const removeToast = (id: string) => {
  //   setToasts(prev => prev.filter(toast => toast.id !== id));
  // };
  // FIM DAS FUNÇÕES LOCAIS A SEREM REMOVIDAS

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      setFileName(file.name);
      setErrors([]);
      
      // ALTERAR A CHAMADA addToast AQUI PARA O NOVO FORMATO
      addToast(
        `Arquivo selecionado: ${file.name} pronto para importação`,
        'success',
        3000
      );
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    if (!csvFile) {
      // ALTERAR A CHAMADA addToast AQUI PARA O NOVO FORMATO
      addToast(
        'Por favor, selecione um arquivo CSV',
        'error'
      );
      setLoading(false);
      return;
    }

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        const csvString = event.target?.result as string;
        const result = await importarMembrosCSV(csvString);

        if (result.success) {
          // ALTERAR A CHAMADA addToast AQUI PARA O NOVO FORMATO
          addToast(
            `${result.importedCount} membros importados com sucesso!`,
            'success',
            4000
          );

          setTimeout(() => {
            router.push('/membros');
          }, 2000);
        } else {
          // ALTERAR A CHAMADA addToast AQUI PARA O NOVO FORMATO
          addToast(
            `Importação parcial: ${result.importedCount} sucessos, ${result.errors.length} erros.`,
            'warning'
          );
          setErrors(result.errors);
        }
        setLoading(false);
      };
      
      fileReader.onerror = () => {
        // ALTERAR A CHAMADA addToast AQUI PARA O NOVO FORMATO
        addToast(
          'Não foi possível ler o arquivo.',
          'error'
        );
        setLoading(false);
      };
      
      fileReader.readAsText(csvFile);
    } catch (error: any) {
      console.error("Erro ao ler arquivo ou na importação:", error);
      // ALTERAR A CHAMADA addToast AQUI PARA O NOVO FORMATO
      addToast(
        `Erro inesperado: ${error.message || "Erro desconhecido durante a importação"}`,
        'error'
      );
      setLoading(false);
    }
  };

  // REMOVER ESTAS FUNÇÕES LOCAIS E SEUS USOS
  // Ícones para os toasts
  // const getToastIcon = (type: Toast['type']) => { ... };
  // const getToastStyles = (type: Toast['type']) => { ... };
  // FIM DAS FUNÇÕES LOCAIS A SEREM REMOVIDAS


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* NOVO: Container de Toasts global */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            duration={toast.duration}
          />
        ))}
      </div>
      {/* FIM NOVO: Container de Toasts */}

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
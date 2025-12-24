// src/app/(app)/membros/importar/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Importa funções de data.ts
import { importarMembrosCSV } from '@/lib/data';
// Importa a interface ImportMembroResult de types.ts
import { ImportMembroResult } from '@/lib/types'; 

// --- REFATORAÇÃO: TOASTS ---
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner'; // Para o loading inicial, embora não usado diretamente aqui
// --- FIM REFATORAÇÃO ---

export default function ImportarMembrosPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ImportMembroResult['errors']>([]); 
  const [fileName, setFileName] = useState<string>('');

  const router = useRouter();

  const { addToast, removeToast, ToastContainer } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      setFileName(file.name);
      setErrors([]);
      
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
          addToast(
            `${result.importedCount} membros importados com sucesso!`,
            'success',
            4000
          );

          setTimeout(() => {
            router.push('/membros');
          }, 2000);
        } else {
          addToast(
            `Importação parcial: ${result.importedCount} sucessos, ${result.errors.length} erros.`,
            'warning'
          );
          setErrors(result.errors);
        }
        setLoading(false);
      };
      
      fileReader.onerror = () => {
        addToast(
          'Não foi possível ler o arquivo.',
          'error'
        );
        setLoading(false);
      };
      
      fileReader.readAsText(csvFile);
    } catch (error: any) {
      console.error("Erro ao ler arquivo ou na importação:", error);
      addToast(
        `Erro inesperado: ${error.message || "Erro desconhecido durante a importação"}`,
        'error'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Renderiza o ToastContainer do hook global */}
      <ToastContainer />

      {/* Conteúdo Principal */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Header com Gradiente */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-6 sm:py-8"> {/* Ajuste de padding aqui */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3"> {/* Ajuste de fonte */}
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"> {/* Ajuste de ícone */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Importar Membros
                </h1>
                <p className="text-green-100 mt-2 text-sm sm:text-base">Importe membros em lote usando arquivo CSV</p> {/* Ajuste de fonte */}
              </div>
              <Link 
                href="/membros"
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30 text-sm" // Ajuste de padding e fonte
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> {/* Ajuste de ícone */}
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
              </Link>
            </div>
          </div>

          {/* Formulário */}
          <div className="p-4 sm:p-6"> {/* Padding ajustado */}
            <form onSubmit={handleImport} className="space-y-6">
              {/* Upload de Arquivo */}
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border-2 border-dashed border-gray-300 hover:border-green-400 transition-all duration-200"> {/* Padding ajustado */}
                <label htmlFor="csvFile" className="block text-center cursor-pointer">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> {/* Ícone ajustado */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span className="block text-base sm:text-sm font-semibold text-gray-700 mb-2"> {/* Fonte ajustada */}
                    {fileName ? fileName : 'Selecione o arquivo CSV'}
                  </span>
                  <span className="block text-xs sm:text-sm text-gray-500 mb-4"> {/* Fonte ajustada */}
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
                  <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"> {/* Padding e fonte ajustados */}
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> {/* Ícone ajustado */}
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Selecionar Arquivo
                  </div>
                </label>
              </div>

              {/* Instruções */}
              <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200"> {/* Padding ajustado */}
                <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2"> {/* Fonte ajustada */}
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> {/* Ícone ajustado */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Formato do CSV
                </h3>
                <div className="space-y-2 text-sm text-blue-700">
                  <p>O CSV deve ter os seguintes cabeçalhos (case-insensitive, ordem não importa):</p>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-blue-200"> {/* Padding ajustado */}
                    <code className="text-xs sm:text-sm font-mono bg-blue-100 px-1.5 py-0.5 rounded"> {/* Fonte ajustada */}
                      nome, telefone, data_ingresso, data_nascimento, endereco, status
                    </code>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="font-semibold text-sm">Campos obrigatórios:</p> {/* Fonte ajustada */}
                    <ul className="list-disc list-inside ml-2 space-y-1 text-sm"> {/* Fonte ajustada */}
                      <li><code className="bg-blue-100 px-1 rounded">nome</code></li>
                      <li><code className="bg-blue-100 px-1 rounded">data_ingresso</code></li>
                    </ul>
                    <p className="font-semibold mt-2 text-sm">Status permitidos:</p> {/* Fonte ajustada */}
                    <ul className="list-disc list-inside ml-2 text-sm"> {/* Fonte ajustada */}
                      <li>Ativo, Inativo, Em transição</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botão de Importação */}
              <button
                type="submit"
                disabled={loading || !csvFile}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-5 sm:py-4 sm:px-6 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2 text-base" // Padding e fonte ajustados
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div> {/* Ícone ajustado */}
                    Importando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> {/* Ícone ajustado */}
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
                <div className="bg-red-600 px-4 py-3 sm:px-6 sm:py-4"> {/* Padding ajustado */}
                  <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2"> {/* Fonte ajustada */}
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> {/* Ícone ajustado */}
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Erros na Importação ({errors.length})
                  </h3>
                </div>
                <div className="max-h-80 overflow-y-auto p-3 sm:p-4"> {/* Padding ajustado */}
                  <div className="space-y-3">
                    {errors.map((err, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-red-200 shadow-sm"> {/* Padding ajustado */}
                        <div className="flex items-start gap-2 sm:gap-3"> {/* Espaçamento ajustado */}
                          <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold"> {/* Tamanho do círculo e fonte ajustados */}
                            {err.rowIndex}
                          </div>
                          <div className="flex-1">
                            <p className="text-red-700 font-medium text-sm"> {err.error}</p> {/* Fonte ajustada */}
                            {err.data && (
                              <div className="mt-2 p-2 bg-gray-50 rounded border text-xs sm:text-sm"> {/* Fonte ajustada */}
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
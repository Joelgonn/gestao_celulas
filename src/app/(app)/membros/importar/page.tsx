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
// REMOVA 'import Toast from '@/components/ui/Toast';' se não for mais usado diretamente
// (o ToastContainer do hook já importa e usa o componente Toast internamente)
// import Toast from '@/components/ui/Toast';
// --- FIM REFATORAÇÃO TOASTS ---

// Importando ícones react-icons para consistência
import { FaCloudUploadAlt, FaArrowLeft, FaFileCsv, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaSpinner } from 'react-icons/fa';

export default function ImportarMembrosPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ImportMembroResult['errors']>([]); 
  const [fileName, setFileName] = useState<string>('');

  const router = useRouter();

  // MUDANÇA AQUI: Desestruture ToastContainer, não toasts
  const { addToast, removeToast, ToastContainer } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      setFileName(file.name);
      setErrors([]);
      
      addToast(
        `Arquivo selecionado: ${file.name}`,
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
            `${result.importedCount} membros importados!`,
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
        `Erro inesperado: ${error.message || "Erro desconhecido"}`,
        'error'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
      {/* Renderiza o ToastContainer do hook global */}
      <ToastContainer />

      {/* Conteúdo Principal */}
      <div className="max-w-2xl mx-auto mt-4 sm:mt-0">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          
          {/* Header Responsivo */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                  <FaCloudUploadAlt className="w-6 h-6 sm:w-8 sm:h-8" />
                  Importar Membros
                </h1>
                <p className="text-green-100 mt-1 text-sm sm:text-base">Importe membros em lote via CSV</p>
              </div>
              
              <Link 
                href="/membros"
                className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
              >
                <FaArrowLeft className="w-3 h-3 mr-2" />
                Voltar
              </Link>
            </div>
          </div>

          {/* Formulário */}
          <div className="p-4 sm:p-8">
            <form onSubmit={handleImport} className="space-y-6 sm:space-y-8">
              
              {/* Área de Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Selecione o arquivo</label>
                <label 
                    htmlFor="csvFile" 
                    className={`
                        flex flex-col items-center justify-center w-full h-32 sm:h-40 
                        border-2 border-dashed rounded-lg cursor-pointer transition-colors
                        ${fileName ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
                    `}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                        {fileName ? (
                            <>
                                <FaFileCsv className="w-8 h-8 text-green-600 mb-2" />
                                <p className="text-sm text-green-700 font-medium break-all max-w-xs">{fileName}</p>
                                <p className="text-xs text-green-600 mt-1">Clique para trocar</p>
                            </>
                        ) : (
                            <>
                                <FaCloudUploadAlt className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500 font-medium">Toque para selecionar o CSV</p>
                                <p className="text-xs text-gray-400 mt-1">ou arraste e solte aqui</p>
                            </>
                        )}
                    </div>
                    <input
                        type="file"
                        id="csvFile"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                        required
                        disabled={loading}
                    />
                </label>
              </div>

              {/* Instruções */}
              <div className="bg-blue-50 rounded-xl p-4 sm:p-5 border border-blue-200 text-sm text-blue-800">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-base">
                  <FaInfoCircle /> Formato Obrigatório
                </h3>
                <p className="mb-3">O arquivo CSV deve conter os seguintes cabeçalhos:</p>
                <div className="bg-white rounded-lg p-3 border border-blue-100 overflow-x-auto mb-4">
                  <code className="font-mono text-xs sm:text-sm text-blue-700 whitespace-nowrap">
                    nome, telefone, data_ingresso, data_nascimento, endereco, status
                  </code>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p className="font-semibold text-xs uppercase tracking-wide text-blue-600 mb-1">Obrigatórios</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                            <li>nome</li>
                            <li>data_ingresso</li>
                        </ul>
                    </div>
                    <div>
                        <p className="font-semibold text-xs uppercase tracking-wide text-blue-600 mb-1">Status Válidos</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                            <li>Ativo</li>
                            <li>Inativo</li>
                            <li>Em transição</li>
                        </ul>
                    </div>
                </div>
              </div>

              {/* Botão de Ação */}
              <button
                type="submit"
                disabled={loading || !csvFile}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-bold py-4 px-6 rounded-xl shadow-md active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <FaCheckCircle /> Iniciar Importação
                  </>
                )}
              </button>
            </form>

            {/* Lista de Erros */}
            {errors.length > 0 && (
              <div className="mt-8 animate-in slide-in-from-bottom duration-300">
                <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-red-100 px-4 py-3 border-b border-red-200 flex justify-between items-center">
                    <h3 className="font-bold text-red-800 flex items-center gap-2">
                      <FaExclamationTriangle /> Erros ({errors.length})
                    </h3>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto divide-y divide-red-100">
                    {errors.map((err, index) => (
                      <div key={index} className="p-4 text-sm hover:bg-red-50/50 transition-colors">
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-red-200 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {err.rowIndex}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-red-700 font-medium mb-1">{err.error}</p>
                            {err.data && (
                                <div className="bg-white border border-red-100 rounded p-2 text-xs font-mono text-gray-600 overflow-x-auto">
                                    {JSON.stringify(err.data)}
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
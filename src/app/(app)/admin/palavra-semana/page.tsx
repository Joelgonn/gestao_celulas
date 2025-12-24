// src/app/(app)/admin/palavra-semana/page.tsx

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
    FaUpload, 
    FaCalendarAlt, 
    FaFilePdf, 
    FaRegEdit, 
    FaRegTrashAlt, 
    FaPlus, 
    FaInfoCircle,
    FaArrowLeft,
    FaSpinner,
    FaBookOpen,
    FaFileDownload
} from 'react-icons/fa';
// ADICIONAR ESTAS DUAS LINHAS:
import useToast from '@/hooks/useToast';
// REMOVA 'import Toast from '@/components/ui/Toast';' se não for mais usado diretamente

import LoadingSpinner from '@/components/LoadingSpinner';
import { 
    uploadPalavraDaSemana, 
    getPalavraDaSemana, 
    deletePalavraDaSemana, 
} from '@/lib/data';
import { PalavraDaSemana } from '@/lib/types'; // <--- ADICIONE ESTA LINHA para importar do types.ts
import { formatDateForDisplay, formatDateForInput } from '@/utils/formatters';

export default function AdminPalavraSemanaPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataSemana, setDataSemana] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [currentPalavra, setCurrentPalavra] = useState<PalavraDaSemana | null>(null);
    // MUDANÇA AQUI: Desestruture ToastContainer, não toasts
    const { addToast, removeToast, ToastContainer } = useToast();

    // Calcula a data da segunda-feira da semana atual para o input padrão
    const getDefaultDateForWeek = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajusta para a segunda-feira
        const monday = new Date(today.setDate(diff));
        return formatDateForInput(monday.toISOString());
    }, []);

    const fetchCurrentPalavra = useCallback(async () => {
        setLoading(true);
        try {
            const palavra = await getPalavraDaSemana();
            setCurrentPalavra(palavra);
            if (palavra) {
                setTitulo(palavra.titulo);
                setDescricao(palavra.descricao || '');
                setDataSemana(palavra.data_semana);
            } else {
                // Se não há palavra, reseta o formulário para um novo post
                setTitulo('');
                setDescricao('');
                setDataSemana(getDefaultDateForWeek);
                setSelectedFile(null); // Garante que o arquivo selecionado é limpo para um novo post
                if (document.getElementById('file')) {
                    (document.getElementById('file') as HTMLInputElement).value = '';
                }
            }
        } catch (error: any) {
            console.error("Erro ao carregar a Palavra da Semana:", error);
            addToast(`Erro ao carregar a Palavra da Semana: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast, getDefaultDateForWeek]);

    useEffect(() => {
        fetchCurrentPalavra();
    }, [fetchCurrentPalavra]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Verifica o tipo do arquivo (apenas PDF ou PPT/PPTX)
            if (!['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(file.type)) {
                addToast('Por favor, selecione um arquivo PDF, PPT ou PPTX.', 'error');
                e.target.value = ''; // Limpa o input
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
        } else {
            setSelectedFile(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setUploadProgress(0);

        if (!titulo.trim() || !dataSemana) {
            addToast('Por favor, preencha o título e a data da semana.', 'error');
            setSubmitting(false);
            return;
        }

        if (!currentPalavra && !selectedFile) {
            addToast('É necessário selecionar um arquivo PDF/PPT para uma nova Palavra da Semana.', 'error');
            setSubmitting(false);
            return;
        }

        const noChanges = 
            currentPalavra &&
            currentPalavra.titulo === titulo.trim() &&
            currentPalavra.descricao === (descricao.trim() || null) &&
            currentPalavra.data_semana === dataSemana &&
            !selectedFile;

        if (noChanges) {
            addToast('Nenhuma alteração detectada para salvar.', 'info');
            setSubmitting(false);
            return;
        }

        const formData = new FormData();
        formData.append('titulo', titulo.trim());
        formData.append('descricao', descricao.trim());
        formData.append('data_semana', dataSemana);
        if (selectedFile) {
            formData.append('file', selectedFile);
        }
        
        try {
            if (selectedFile) {
                const simulateProgress = setInterval(() => {
                    setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
                }, 200);

                const result = await uploadPalavraDaSemana(formData);
                clearInterval(simulateProgress);
                setUploadProgress(100);
                
                if (result.success) {
                    addToast(result.message, 'success');
                    setSelectedFile(null);
                    if (document.getElementById('file')) {
                        (document.getElementById('file') as HTMLInputElement).value = '';
                    }
                    await fetchCurrentPalavra();
                } else {
                    addToast(result.message, 'error');
                    setUploadProgress(0);
                }

            } else {
                const result = await uploadPalavraDaSemana(formData);
                if (result.success) {
                    addToast(result.message, 'success');
                    await fetchCurrentPalavra();
                } else {
                    addToast(result.message, 'error');
                }
            }

        } catch (error: any) {
            console.error("Erro ao enviar Palavra da Semana:", error);
            addToast(`Erro inesperado: ${error.message}`, 'error');
        } finally {
            setSubmitting(false);
            setTimeout(() => setUploadProgress(0), 1000); 
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta Palavra da Semana? Esta ação é irreversível.')) {
            return;
        }
        setSubmitting(true);
        try {
            const result = await deletePalavraDaSemana(id);
            if (result.success) {
                addToast(result.message, 'success');
                setCurrentPalavra(null);
                setTitulo('');
                setDescricao('');
                setDataSemana(getDefaultDateForWeek);
                setSelectedFile(null);
                 if (document.getElementById('file')) {
                    (document.getElementById('file') as HTMLInputElement).value = '';
                }
            } else {
                addToast(result.message, 'error');
            }
        } catch (error: any) {
            console.error("Erro ao excluir Palavra da Semana:", error);
            addToast(`Erro inesperado: ${error.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 sm:p-6 lg:p-8">
            {/* Renderiza o ToastContainer do hook global */}
            <ToastContainer />

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                <FaBookOpen className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Palavra da Semana</h1>
                                <p className="text-emerald-100 mt-2">Gerencie o material semanal para todas as células</p>
                            </div>
                        </div>
                        <Link 
                            href="/dashboard"
                            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2.5 rounded-xl text-white font-medium transition-all duration-200"
                        >
                            <FaArrowLeft className="text-sm" />
                            <span>Voltar ao Dashboard</span>
                        </Link>
                    </div>
                </div>

                {/* Formulário de Upload */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center space-x-2">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <FaPlus className="text-emerald-600" />
                        </div>
                        <span>{currentPalavra ? 'Atualizar Palavra da Semana' : 'Publicar Nova Palavra da Semana'}</span>
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="dataSemana" className="block text-sm font-medium text-gray-700">
                                    Data da Semana <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="dataSemana"
                                    value={dataSemana}
                                    onChange={(e) => setDataSemana(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                                    required
                                    disabled={submitting}
                                />
                                <p className="text-xs text-gray-500 mt-1">Geralmente a segunda-feira da semana</p>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="titulo" className="block text-sm font-medium text-gray-700">
                                    Título da Mensagem <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="titulo"
                                    placeholder="Ex: A Grande Comissão"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                                    required
                                    disabled={submitting}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                                Descrição (Opcional)
                            </label>
                            <textarea
                                id="descricao"
                                placeholder="Breve descrição sobre a mensagem"
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 h-20 resize-none"
                                disabled={submitting}
                            ></textarea>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                                Upload de Arquivo (PDF, PPT, PPTX) {currentPalavra ? '(Opcional para atualização)' : <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="file"
                                id="file"
                                accept=".pdf,.ppt,.pptx"
                                onChange={handleFileChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                disabled={submitting}
                            />
                            {selectedFile && (
                                <p className="text-sm text-gray-600 mt-2 flex items-center space-x-2">
                                    <FaFilePdf className="text-red-500" />
                                    <span>Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </p>
                            )}
                            {uploadProgress > 0 && uploadProgress < 100 && (
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                    <div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="bg-gradient-to-r from-emerald-600 to-green-500 text-white py-3 px-6 rounded-xl hover:from-emerald-700 hover:to-green-600 transition-all duration-200 disabled:from-emerald-400 disabled:to-green-400 disabled:cursor-not-allowed w-full font-medium shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                            disabled={submitting || (!selectedFile && !currentPalavra)}
                        >
                            {submitting ? (
                                <>
                                    <FaSpinner className="animate-spin" />
                                    <span>{currentPalavra ? 'Atualizando...' : 'Publicando...'}</span>
                                </>
                            ) : (
                                <>
                                    <FaUpload />
                                    <span>{currentPalavra ? 'Atualizar Palavra' : 'Publicar Palavra'}</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Última Palavra da Semana Publicada */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center space-x-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <FaBookOpen className="text-indigo-600" />
                        </div>
                        <span>Última Palavra da Semana</span>
                    </h2>
                    {currentPalavra ? (
                        <div className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                            <div className="flex-1 space-y-1">
                                <p className="text-gray-500 text-xs">Publicada em: {formatDateForDisplay(currentPalavra.data_semana)}</p>
                                <h3 className="font-semibold text-gray-900 text-lg">{currentPalavra.titulo}</h3>
                                <p className="text-gray-700 text-sm">{currentPalavra.descricao || 'Nenhuma descrição.'}</p>
                                <p className="text-gray-500 text-xs">Por: {currentPalavra.created_by_email || 'Admin'}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <a 
                                    href={currentPalavra.url_arquivo} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center space-x-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                    title="Baixar PDF"
                                >
                                    <FaFileDownload className="text-lg" />
                                    <span className="text-sm">Baixar</span>
                                </a
                                ><button
                                    onClick={() => handleDelete(currentPalavra.id)}
                                    className="inline-flex items-center space-x-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                    title="Excluir Palavra"
                                    disabled={submitting}
                                >
                                    <FaRegTrashAlt className="text-lg" />
                                    <span className="text-sm">Excluir</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                            <FaInfoCircle className="text-4xl text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">Nenhuma Palavra da Semana publicada ainda.</p>
                            <p className="text-gray-400 text-sm mt-2">Use o formulário acima para publicar a primeira.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
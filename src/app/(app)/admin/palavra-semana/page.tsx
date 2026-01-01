'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
    FaUpload, 
    FaCalendarAlt, 
    FaFilePdf, 
    FaRegTrashAlt, 
    FaPlus, 
    FaInfoCircle,
    FaArrowLeft,
    FaSpinner,
    FaBookOpen,
    FaFileDownload,
    FaChevronRight,
    FaPen
} from 'react-icons/fa';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { 
    uploadPalavraDaSemana, 
    getPalavraDaSemana, 
    deletePalavraDaSemana, 
} from '@/lib/data';
import { PalavraDaSemana } from '@/lib/types';
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
    
    // Estado para o Modal de Confirmação
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { addToast, ToastContainer } = useToast();

    const getDefaultDateForWeek = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay(); 
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
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
                setTitulo('');
                setDescricao('');
                setDataSemana(getDefaultDateForWeek);
                setSelectedFile(null);
            }
        } catch (error: any) {
            addToast(`Erro ao carregar: ${error.message}`, 'error');
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
            const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
            if (!allowedTypes.includes(file.type)) {
                addToast('Selecione um arquivo PDF ou PPT.', 'error');
                e.target.value = '';
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (!titulo.trim() || !dataSemana) {
            addToast('Preencha o título e a data.', 'error');
            setSubmitting(false);
            return;
        }

        const formData = new FormData();
        formData.append('titulo', titulo.trim());
        formData.append('descricao', descricao.trim());
        formData.append('data_semana', dataSemana);
        if (selectedFile) formData.append('file', selectedFile);
        
        try {
            setUploadProgress(20);
            const result = await uploadPalavraDaSemana(formData);
            
            if (result.success) {
                setUploadProgress(100);
                addToast(result.message, 'success');
                setSelectedFile(null);
                await fetchCurrentPalavra();
            } else {
                addToast(result.message, 'error');
            }
        } catch (error: any) {
            addToast(`Erro: ${error.message}`, 'error');
        } finally {
            setSubmitting(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const confirmDelete = async () => {
        if (!currentPalavra) return;
        setIsDeleteModalOpen(false);
        setSubmitting(true);
        try {
            const result = await deletePalavraDaSemana(currentPalavra.id);
            if (result.success) {
                addToast('Removido com sucesso!', 'success');
                await fetchCurrentPalavra();
            } else {
                addToast(result.message, 'error');
            }
        } catch (error: any) {
            addToast(`Erro ao excluir: ${error.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />

            {/* Modal Profissional */}
            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                title="Remover Palavra?"
                message="Esta ação irá excluir o arquivo atual. Líderes não terão mais acesso a este material até que você publique um novo."
                variant="danger"
                onConfirm={confirmDelete}
                onClose={() => setIsDeleteModalOpen(false)}
                loading={submitting}
            />

            {/* Header com Gradiente */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 pt-8 pb-20 px-4 sm:px-8 border-b border-green-500/20 shadow-lg">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                            <FaBookOpen className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Palavra da Semana</h1>
                            <p className="text-emerald-100 text-sm opacity-80 uppercase tracking-widest font-bold">Conteúdo para Células</p>
                        </div>
                    </div>
                    <Link 
                        href="/dashboard"
                        className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm backdrop-blur-sm border border-white/10"
                    >
                        <FaArrowLeft /> Dashboard
                    </Link>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-10 space-y-8">
                
                {/* Visualização Atual (Card de Destaque) */}
                <div className={`bg-white rounded-[2rem] shadow-xl border-t-8 p-8 transition-all ${currentPalavra ? 'border-indigo-500' : 'border-gray-200'}`}>
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${currentPalavra ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                {currentPalavra ? 'Material Ativo' : 'Nenhum Material'}
                            </span>
                            <h2 className="text-2xl font-black text-gray-900 mt-4 leading-tight">
                                {currentPalavra ? currentPalavra.titulo : 'Aguardando publicação'}
                            </h2>
                            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                                {currentPalavra?.descricao || 'As células ainda não possuem material para esta semana.'}
                            </p>
                            
                            {currentPalavra && (
                                <div className="flex items-center gap-4 mt-6 text-xs font-bold text-gray-400">
                                    <span className="flex items-center gap-1.5"><FaCalendarAlt /> {formatDateForDisplay(currentPalavra.data_semana)}</span>
                                    <span className="flex items-center gap-1.5"><FaInfoCircle /> {currentPalavra.created_by_email?.split('@')[0]}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-row md:flex-col gap-3 shrink-0">
                            {currentPalavra && (
                                <>
                                    <a 
                                        href={currentPalavra.url_arquivo} 
                                        target="_blank" 
                                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                    >
                                        <FaFileDownload /> Baixar
                                    </a>
                                    <button 
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                                    >
                                        <FaRegTrashAlt size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Formulário de Upload (Card Secundário) */}
                <div className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-8">
                    <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaPlus size={16}/></div>
                        {currentPalavra ? 'Substituir Conteúdo' : 'Novo Conteúdo'}
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Data de Referência</label>
                                <input
                                    type="date"
                                    value={dataSemana}
                                    onChange={(e) => setDataSemana(e.target.value)}
                                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-gray-700"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Título da Palavra</label>
                                <input
                                    type="text"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    placeholder="Ex: A Fidelidade de Deus"
                                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-gray-700"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Descrição Curta</label>
                            <textarea
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                placeholder="Sobre o que vamos falar?"
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all h-28 resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Arquivo (PDF ou PPT)</label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".pdf,.ppt,.pptx"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer file:hidden text-sm font-bold text-gray-400 hover:border-emerald-300 transition-all"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2 text-emerald-600">
                                    <FaUpload />
                                    <span className="text-xs font-black uppercase">Selecionar</span>
                                </div>
                                {selectedFile && (
                                    <div className="mt-3 flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl animate-in slide-in-from-top-2">
                                        <FaFilePdf size={14}/>
                                        <span className="text-xs font-bold truncate">{selectedFile.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {uploadProgress > 0 && (
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {submitting ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                            {currentPalavra ? 'Atualizar Material' : 'Publicar Agora'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
// src/app/(app)/admin/celulas/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    FaPlus, 
    FaEdit, 
    FaTrash, 
    FaKey, 
    FaUsers, 
    FaHome, 
    FaSpinner, 
    FaArrowLeft,
    FaSave,
    FaTimes,
    FaCheckCircle,
    FaExclamationTriangle,
    FaCopy,
    FaMapMarkerAlt
} from 'react-icons/fa';
import { useToastStore } from '@/lib/toast';
import {
    fetchCelulasAdmin,
    createCelulaAdmin,
    updateCelulaAdmin,
    deleteCelulaAdmin,
    Celula
} from '@/app/api/admin/celulas/actions';

// --- IMPORTAÇÃO DE CHAVEATIVACAO DO NOVO ARQUIVO types.ts (ALTERADO AQUI) ---
import { createChaveAtivacaoAdmin, listChavesAtivacaoAdmin } from '@/app/api/admin/chaves-ativacao/actions';
import { ChaveAtivacao } from '@/lib/types'; // Importado de types.ts
// --- FIM DA ALTERAÇÃO ---

import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminCelulasPage() {
    const [celulas, setCelulas] = useState<Celula[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newCelulaName, setNewCelulaName] = useState('');
    const [newCelulaLider, setNewCelulaLider] = useState('');
    const [newCelulaEndereco, setNewCelulaEndereco] = useState('');

    const [editingCelulaId, setEditingCelulaId] = useState<string | null>(null);
    const [editingCelulaName, setEditingCelulaName] = useState('');
    const [editingCelulaLider, setEditingCelulaLider] = useState('');
    const [editingCelulaEndereco, setEditingCelulaEndereco] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [chavesAtivacao, setChavesAtivacao] = useState<ChaveAtivacao[]>([]);
    const [loadingChaves, setLoadingChaves] = useState(false);

    const router = useRouter();
    const { addToast } = useToastStore();

    const loadCelulas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchCelulasAdmin();
            setCelulas(data);
        } catch (err: any) {
            console.error("Erro ao carregar células (Admin):", err);
            setError(err.message || "Falha ao carregar células.");
            addToast(`Erro ao carregar células: ${err.message || 'Erro desconhecido.'}`, 'error');
            if (err.message.includes('Não autorizado')) {
                router.push('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    }, [router, addToast]);

    const loadChavesAtivacao = useCallback(async () => {
        setLoadingChaves(true);
        setError(null);
        try {
            const data = await listChavesAtivacaoAdmin();
            setChavesAtivacao(data);
        } catch (err: any) {
            console.error("Erro ao carregar chaves de ativação (Admin):", err);
            setError(err.message || "Falha ao carregar chaves de ativação.");
            addToast(`Erro ao carregar chaves: ${err.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setLoadingChaves(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadCelulas();
        loadChavesAtivacao();
    }, [loadCelulas, loadChavesAtivacao]);

    const handleCreateCelula = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            if (!newCelulaName.trim()) {
                throw new Error("O nome da célula não pode ser vazio.");
            }
            if (!newCelulaLider.trim()) {
                throw new Error("O nome do líder principal não pode ser vazio.");
            }

            await createCelulaAdmin(
                newCelulaName.trim(),
                newCelulaLider.trim(),
                newCelulaEndereco.trim() || null
            );

            setNewCelulaName('');
            setNewCelulaLider('');
            setNewCelulaEndereco('');
            await loadCelulas();
            await loadChavesAtivacao();
            addToast('Célula e chave de ativação criadas com sucesso!', 'success');
        } catch (err: any) {
            console.error("Erro ao criar célula (Admin):", err);
            setError(err.message || "Falha ao criar célula.");
            addToast(`Erro ao criar célula: ${err.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (celula: Celula) => {
        setEditingCelulaId(celula.id);
        setEditingCelulaName(celula.nome);
        setEditingCelulaLider(celula.lider_principal || '');
        setEditingCelulaEndereco(celula.endereco || '');
    };

    const handleUpdateCelula = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            if (!editingCelulaId || !editingCelulaName.trim()) {
                throw new Error("Nome da célula ou ID de edição inválido.");
            }
            if (!editingCelulaLider.trim()) {
                throw new Error("O nome do líder principal não pode ser vazio.");
            }
            await updateCelulaAdmin(
                editingCelulaId,
                editingCelulaName.trim(),
                editingCelulaLider.trim(),
                editingCelulaEndereco.trim() || null
            );
            setEditingCelulaId(null);
            setEditingCelulaName('');
            setEditingCelulaLider('');
            setEditingCelulaEndereco('');
            await loadCelulas();
            addToast('Célula atualizada com sucesso!', 'success');
        } catch (err: any) {
            console.error("Erro ao atualizar célula (Admin):", err);
            setError(err.message || "Falha ao atualizar célula.");
            addToast(`Erro ao atualizar célula: ${err.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCelula = async (celulaId: string, celulaName: string) => {
        if (!confirm(`Tem certeza que deseja excluir a célula "${celulaName}"? Esta ação é irreversível e pode causar inconsistência de dados se houver membros/reuniões associados.`)) {
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await deleteCelulaAdmin(celulaId);
            await loadCelulas();
            await loadChavesAtivacao();
            addToast(`Célula "${celulaName}" excluída com sucesso!`, 'success');
        } catch (err: any) {
            console.error("Erro ao excluir célula (Admin):", err);
            setError(err.message || "Falha ao excluir célula. Verifique dependências (membros, reuniões) ou RLS.");
            addToast(`Erro ao excluir célula: ${err.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateKey = async (celulaId: string, celulaName: string) => {
        if (!confirm(`Gerar uma nova chave de ativação para a célula "${celulaName}"?`)) {
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const newKey = await createChaveAtivacaoAdmin(celulaId);
            await loadChavesAtivacao();
            addToast(`Chave gerada para ${celulaName}: ${newKey.chave}`, 'success');
        } catch (err: any) {
            console.error("Erro ao gerar chave de ativação:", err);
            setError(err.message || "Falha ao gerar chave de ativação.");
            addToast(`Erro ao gerar chave: ${err.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Chave copiada para a área de transferência!', 'success');
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
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                <FaHome className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Gerenciar Células</h1>
                                <p className="text-emerald-100 mt-2">Administre as células e chaves de ativação do sistema</p>
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

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                        <div className="flex items-center space-x-3">
                            <FaExclamationTriangle className="text-red-500 text-xl flex-shrink-0" />
                            <div>
                                <h3 className="text-red-800 font-medium">Erro</h3>
                                <p className="text-red-600 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Formulário para Adicionar Nova Célula */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center space-x-2">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <FaPlus className="text-emerald-600" />
                        </div>
                        <span>Adicionar Nova Célula</span>
                    </h2>
                    <form onSubmit={handleCreateCelula} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="newCelulaName" className="block text-sm font-medium text-gray-700">
                                    Nome da Célula <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="newCelulaName"
                                    placeholder="Ex: Célula Betel"
                                    value={newCelulaName}
                                    onChange={(e) => setNewCelulaName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                                    required
                                    disabled={submitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="newCelulaLider" className="block text-sm font-medium text-gray-700">
                                    Líder Principal <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="newCelulaLider"
                                    placeholder="Nome completo do líder principal"
                                    value={newCelulaLider}
                                    onChange={(e) => setNewCelulaLider(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                                    required
                                    disabled={submitting}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="newCelulaEndereco" className="block text-sm font-medium text-gray-700 flex items-center space-x-2">
                                <FaMapMarkerAlt className="text-gray-400 text-sm" />
                                <span>Endereço (Opcional)</span>
                            </label>
                            <textarea
                                id="newCelulaEndereco"
                                placeholder="Endereço completo do local da célula"
                                value={newCelulaEndereco}
                                onChange={(e) => setNewCelulaEndereco(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 h-20 resize-none"
                                disabled={submitting}
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            className="bg-gradient-to-r from-emerald-600 to-green-500 text-white py-3 px-6 rounded-xl hover:from-emerald-700 hover:to-green-600 transition-all duration-200 disabled:from-emerald-400 disabled:to-green-400 disabled:cursor-not-allowed w-full font-medium shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <FaSpinner className="animate-spin" />
                                    <span>Adicionando...</span>
                                </>
                            ) : (
                                <>
                                    <FaPlus />
                                    <span>Adicionar Célula</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Lista de Células Existentes */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <FaUsers className="text-indigo-600" />
                            </div>
                            <span>Células Existentes</span>
                        </h2>
                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                            {celulas.length} {celulas.length === 1 ? 'célula' : 'células'}
                        </div>
                    </div>
                    
                    {celulas.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                            <FaUsers className="text-4xl text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">Nenhuma célula cadastrada</p>
                            <p className="text-gray-400 text-sm mt-2">Adicione a primeira célula usando o formulário acima</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {celulas.map((celula) => (
                                <div key={celula.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                                    {editingCelulaId === celula.id ? (
                                        <form onSubmit={handleUpdateCelula} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Nome da Célula</label>
                                                    <input
                                                        type="text"
                                                        value={editingCelulaName}
                                                        onChange={(e) => setEditingCelulaName(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                                        required
                                                        disabled={submitting}
                                                        placeholder="Nome da Célula"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Líder Principal</label>
                                                    <input
                                                        type="text"
                                                        value={editingCelulaLider}
                                                        onChange={(e) => setEditingCelulaLider(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                                        required
                                                        disabled={submitting}
                                                        placeholder="Líder Principal"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Endereço</label>
                                                    <input
                                                        type="text"
                                                        value={editingCelulaEndereco}
                                                        onChange={(e) => setEditingCelulaEndereco(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                                        disabled={submitting}
                                                        placeholder="Endereço"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex space-x-3 justify-end">
                                                <button
                                                    type="submit"
                                                    className="flex items-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                                                    disabled={submitting}
                                                >
                                                    <FaSave className="text-sm" />
                                                    <span>{submitting ? 'Salvando...' : 'Salvar'}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingCelulaId(null)}
                                                    className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-400"
                                                    disabled={submitting}
                                                >
                                                    <FaTimes className="text-sm" />
                                                    <span>Cancelar</span>
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 text-lg">{celula.nome}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">ID: {celula.id.substring(0, 8)}...</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-700">
                                                        <span className="font-medium">Líder:</span> {celula.lider_principal || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 text-sm">
                                                        <span className="font-medium">Endereço:</span> {celula.endereco || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleEditClick(celula)}
                                                    className="inline-flex items-center space-x-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                    title="Editar Célula"
                                                    disabled={submitting}
                                                >
                                                    <FaEdit className="text-sm" />
                                                    <span className="text-sm">Editar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleGenerateKey(celula.id, celula.nome)}
                                                    className="inline-flex items-center space-x-2 p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                                                    title="Gerar Chave"
                                                    disabled={submitting}
                                                >
                                                    <FaKey className="text-sm" />
                                                    <span className="text-sm">Chave</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCelula(celula.id, celula.nome)}
                                                    className="inline-flex items-center space-x-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                                    title="Excluir Célula"
                                                    disabled={submitting}
                                                >
                                                    <FaTrash className="text-sm" />
                                                    <span className="text-sm">Excluir</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lista de Chaves de Ativação */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <FaKey className="text-purple-600" />
                            </div>
                            <span>Chaves de Ativação</span>
                        </h2>
                        <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                            {chavesAtivacao.length} {chavesAtivacao.length === 1 ? 'chave' : 'chaves'}
                        </div>
                    </div>
                    
                    {loadingChaves ? (
                        <div className="text-center p-8">
                            <FaSpinner className="animate-spin text-2xl text-indigo-600 mx-auto mb-2" />
                            <p className="text-gray-500">Carregando chaves...</p>
                        </div>
                    ) : chavesAtivacao.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                            <FaKey className="text-4xl text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">Nenhuma chave de ativação</p>
                            <p className="text-gray-400 text-sm mt-2">Gere chaves para as células usando o botão "Chave"</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {chavesAtivacao.map((chave) => {
                                const celula = celulas.find(c => c.id === chave.celula_id);
                                return (
                                    <div 
                                        key={chave.chave} 
                                        className={`p-4 rounded-xl border transition-all duration-200 ${
                                            chave.usada 
                                                ? 'bg-gray-100 border-gray-300' 
                                                : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                                                chave.usada 
                                                    ? 'bg-gray-200 text-gray-700' 
                                                    : 'bg-green-200 text-green-700'
                                            }`}>
                                                {chave.usada ? (
                                                    <span className="flex items-center space-x-1">
                                                        <FaCheckCircle className="text-sm" />
                                                        <span>Usada</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center space-x-1">
                                                        <FaKey className="text-sm" />
                                                        <span>Ativa</span>
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <p className="text-xs text-gray-600 mb-1">Célula</p>
                                            <p className="font-medium text-gray-800">
                                                {celula?.nome || 'Célula não encontrada'}
                                            </p>
                                        </div>

                                        <div className="mb-3">
                                            <p className="text-xs text-gray-600 mb-1">Chave de Ativação</p>
                                            <div className="flex items-center space-x-2">
                                                <code className="font-mono text-sm bg-white/80 p-2 rounded border flex-1 truncate">
                                                    {chave.chave}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(chave.chave)}
                                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                                    title="Copiar chave"
                                                >
                                                    <FaCopy className="text-sm" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-500">
                                            Criada em: {new Date(chave.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
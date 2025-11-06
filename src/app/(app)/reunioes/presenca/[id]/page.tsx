    const handleVisitanteChange = (visitanteId: string, presente: boolean) => {
        setVisitantesPresenca(prev => prev.map(v =>
            v.visitante_id === visitanteId ? { ...v, presente: presente } : v // <-- LINHA COM ERRO
        ));
    };
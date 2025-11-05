// src/app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
    // 1. Verifica a sessão do usuário logado usando o cliente SSR do Supabase
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Se não houver usuário, retorna erro 401 (Unauthorized)
    if (!user) {
        console.error('API Route /api/generate-pdf: Tentativa de acesso não autorizado.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parseia os dados da requisição (o corpo JSON enviado do frontend)
    const requestData = await req.json();

    try {
        // --- INÍCIO DA REFATORAÇÃO ---
        // A URL do seu serviço Python.
        // Em desenvolvimento, use a URL local do Flask: 'http://127.0.0.1:5000/generate-report-pdf'
        // Em produção (Vercel), esta será a URL da sua Serverless Function Python.
        // Usamos uma variável de ambiente para flexibilidade. É importante que NÃO seja `NEXT_PUBLIC_`
        // pois esta é uma informação do lado do servidor.
        const pythonServiceUrl = process.env.PYTHON_PDF_SERVICE_URL || 'http://127.0.0.1:5000/generate-report-pdf';

        if (!pythonServiceUrl) {
            console.error('API Route /generate-pdf: Variável de ambiente PYTHON_PDF_SERVICE_URL não configurada.');
            return NextResponse.json({ error: 'Python PDF service endpoint not configured.' }, { status: 500 });
        }

        console.log(`API Route /api/generate-pdf: Encaminhando requisição para: ${pythonServiceUrl}`);
        
        // Faz a requisição POST para o serviço Python
        const pythonResponse = await fetch(pythonServiceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });
        // --- FIM DA REFATORAÇÃO ---

        // Verifica se a resposta do serviço Python foi bem-sucedida
        if (!pythonResponse.ok) {
            const errorText = await pythonResponse.text();
            console.error('API Route /api/generate-pdf: Erro retornado pelo serviço Python:', pythonResponse.status, errorText);
            return NextResponse.json({ error: `Python service error: ${errorText}` }, { status: pythonResponse.status });
        }

        // Se a resposta foi OK, processa o blob (o arquivo PDF) e os headers
        const blob = await pythonResponse.blob();
        const headers = new Headers(pythonResponse.headers);
        
        const contentDisposition = headers.get('Content-Disposition');
        const filenameMatch = contentDisposition && contentDisposition.match(/filename="([^"]+)"/);
        const filename = filenameMatch ? filenameMatch[1] : 'report.pdf';

        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        headers.set('Content-Type', 'application/pdf');

        console.log(`API Route /api/generate-pdf: PDF gerado com sucesso: ${filename}`);

        // Retorna a resposta com o blob do PDF e os headers corretos
        return new NextResponse(blob, {
            status: 200,
            headers: headers,
        });

    } catch (error: any) {
        console.error('API Route /api/generate-pdf: Erro ao chamar o serviço Python:', error);
        return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
    }
}
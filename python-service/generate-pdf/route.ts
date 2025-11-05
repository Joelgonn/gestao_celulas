// src/app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server'; // Para verificar a sessão do usuário

export async function POST(req: NextRequest) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestData = await req.json();

    try {
        // A URL DO SEU SERVIÇO PYTHON DEPLOYADO NO VERCEL
        // Em desenvolvimento, use a URL local do Flask: 'http://localhost:5000/generate-report-pdf'
        // Em produção, será o endpoint da sua Serverless Function Python dentro do Vercel.
        // Se você colocou em `api/generate-pdf.py` na raiz do projeto, a URL será `/api/generate-pdf`.
        // Se você colocou em `src/app/api/python_pdf_generator/route.py`, a URL seria `/api/python_pdf_generator`.
        const pythonServiceUrl = process.env.NEXT_PUBLIC_PYTHON_PDF_SERVICE_ENDPOINT || 'http://localhost:3000/api/python_pdf_generator'; // Ajuste conforme seu deploy Python

        const pythonResponse = await fetch(pythonServiceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Adicione headers de autorização se seu serviço Python precisar (ex: um token de API)
            },
            body: JSON.stringify(requestData),
        });

        if (!pythonResponse.ok) {
            const errorText = await pythonResponse.text();
            console.error('Erro do serviço Python:', pythonResponse.status, errorText);
            return NextResponse.json({ error: `Python service error: ${errorText}` }, { status: pythonResponse.status });
        }

        const blob = await pythonResponse.blob();
        const headers = new Headers(pythonResponse.headers);
        
        const contentDisposition = headers.get('Content-Disposition');
        const filenameMatch = contentDisposition && contentDisposition.match(/filename="([^"]+)"/);
        const filename = filenameMatch ? filenameMatch[1] : 'report.pdf';

        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        headers.set('Content-Type', 'application/pdf'); // Garante que o tipo é PDF

        return new NextResponse(blob, {
            status: 200,
            headers: headers,
        });

    } catch (error: any) {
        console.error('Erro ao chamar o serviço Python:', error);
        return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
    }
}
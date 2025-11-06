# src/app/api/python_pdf_generator/route.py

# Importações necessárias para o ambiente Vercel Python e ReportLab
import json
import os
from io import BytesIO
from werkzeug.wrappers import Request, Response # Vercel runtime fornece Request e Response

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Importe suas funções de formatação do mesmo diretório.
# O ponto '.' indica o diretório atual.
from .formatters import format_phone_number_for_pdf, format_date_for_pdf, format_nullable_data

# --- Configuração da Fonte (Refatoração 1.1) ---
# O caminho para as fontes deve ser relativo ao diretório do script,
# funcionando em ambiente Vercel (onde os arquivos são empacotados).
FONT_FOLDER = os.path.join(os.path.dirname(__file__), 'fonts')
DEFAULT_FONT_NORMAL = 'DejaVuSans'
DEFAULT_FONT_BOLD = 'DejaVuSans-Bold'

try:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    
    # Registra a fonte DejaVu Sans (normal e bold)
    # Garante que os arquivos .ttf estão na pasta 'fonts' dentro do mesmo diretório
    pdfmetrics.registerFont(TTFont(DEFAULT_FONT_NORMAL, os.path.join(FONT_FOLDER, 'DejaVuSans.ttf')))
    pdfmetrics.registerFont(TTFont(DEFAULT_FONT_BOLD, os.path.join(FONT_FOLDER, 'DejaVuSans-Bold.ttf')))
    
    # Mapeamento para que ReportLab use suas fontes para estilos "normal" e "bold"
    from reportlab.lib.fonts import addMapping
    addMapping('Helvetica', 0, 0, DEFAULT_FONT_NORMAL) # Mapeia Helvetica padrão para DejaVu Sans normal
    addMapping('Helvetica', 1, 0, DEFAULT_FONT_BOLD)   # Mapeia Helvetica Bold para DejaVu Sans bold
    # Também mapear os nomes diretos para segurança
    addMapping(DEFAULT_FONT_NORMAL, 0, 0, DEFAULT_FONT_NORMAL)
    addMapping(DEFAULT_FONT_NORMAL, 1, 0, DEFAULT_FONT_BOLD)
    
except Exception as e:
    print(f"AVISO: Não foi possível registrar as fontes personalizadas. Usando Helvetica. Erro: {e}")
    DEFAULT_FONT_NORMAL = 'Helvetica'
    DEFAULT_FONT_BOLD = 'Helvetica-Bold'
# --- Fim da Configuração da Fonte ---


class PDFGenerator:
    def __init__(self, buffer_obj):
        self.buffer = buffer_obj
        self.doc = SimpleDocTemplate(buffer_obj, pagesize=A4,
                                     rightMargin=2 * cm, leftMargin=2 * cm,
                                     topMargin=2 * cm, bottomMargin=2 * cm)
        self.story = []
        self.styles = getSampleStyleSheet()

        # Configuração dos Estilos Personalizados (Refatoração 1.2)
        # Aplica as fontes padrão configuradas e outros ajustes
        
        # Garante que os estilos básicos herdam a nova fonte padrão
        self.styles['Normal'].fontName = DEFAULT_FONT_NORMAL
        self.styles['Italic'].fontName = DEFAULT_FONT_NORMAL
        self.styles['Bold'].fontName = DEFAULT_FONT_BOLD
        self.styles['Code'].fontName = DEFAULT_FONT_NORMAL

        self.styles['Title'].fontName = DEFAULT_FONT_BOLD
        self.styles['Title'].fontSize = 18
        self.styles['Title'].leading = 22
        self.styles['Title'].alignment = TA_CENTER
        self.styles['Title'].spaceAfter = 15
        self.styles['Title'].textColor = colors.black

        self.styles.add(ParagraphStyle(name='Celula_SectionHeading',
                                       parent=self.styles['Normal'],
                                       fontName=DEFAULT_FONT_BOLD,
                                       fontSize=14,
                                       leading=18,
                                       spaceAfter=10,
                                       textColor=colors.HexColor('#e67e22'))) # Laranja
        
        self.styles.add(ParagraphStyle(name='Celula_SubSectionHeading',
                                       parent=self.styles['Normal'],
                                       fontName=DEFAULT_FONT_BOLD,
                                       fontSize=12,
                                       leading=15,
                                       spaceAfter=7,
                                       textColor=colors.HexColor('#f39c12'))) # Laranja mais claro

        self.styles.add(ParagraphStyle(name='Celula_NormalParagraph',
                                       parent=self.styles['Normal'],
                                       fontName=DEFAULT_FONT_NORMAL,
                                       fontSize=10,
                                       leading=12,
                                       alignment=TA_LEFT,
                                       textColor=colors.black))

        self.styles.add(ParagraphStyle(name='Celula_SmallItalicText',
                                       parent=self.styles['Normal'],
                                       fontName=DEFAULT_FONT_NORMAL,
                                       fontSize=9,
                                       leading=11,
                                       textColor=colors.HexColor('#666666')))

        # Estilos para tabela
        self.table_header_style = self.styles['Normal'].clone('table_header_style', 
                                                              fontName=DEFAULT_FONT_BOLD, 
                                                              fontSize=10, 
                                                              alignment=TA_CENTER,
                                                              textColor=colors.whitesmoke)
        self.table_body_style = self.styles['Normal'].clone('table_body_style', 
                                                            fontName=DEFAULT_FONT_NORMAL, 
                                                            fontSize=9, 
                                                            alignment=TA_LEFT,
                                                            textColor=colors.black)


    def add_title(self, text):
        self.story.append(Paragraph(text, self.styles['Title']))
        self.story.append(Spacer(1, 0.5 * cm))

    def add_section_heading(self, text):
        self.story.append(Paragraph(text, self.styles['Celula_SectionHeading']))
        self.story.append(Spacer(1, 0.2 * cm))

    def add_subsection_heading(self, text):
        self.story.append(Paragraph(text, self.styles['Celula_SubSectionHeading']))
        self.story.append(Spacer(1, 0.1 * cm))

    def add_paragraph(self, text):
        self.story.append(Paragraph(text, self.styles['Celula_NormalParagraph']))
        self.story.append(Spacer(1, 0.1 * cm))

    def add_small_italic_text(self, text):
        self.story.append(Paragraph(f"<i>{text}</i>", self.styles['Celula_SmallItalicText']))
        self.story.append(Spacer(1, 0.1 * cm))

    def add_table(self, data, col_widths=None):
        if not data or len(data) < 1:
            self.add_small_italic_text("Nenhum dado para exibir na tabela.")
            return

        header_row = [Paragraph(format_nullable_data(cell), self.table_header_style) for cell in data[0]]
        body_rows = []
        for row in data[1:]:
            body_rows.append([Paragraph(format_nullable_data(cell), self.table_body_style) for cell in row])

        table_data = [header_row] + body_rows

        num_cols = len(header_row)
        page_width = A4[0] - self.doc.leftMargin - self.doc.rightMargin
        if col_widths is None:
            col_widths = [page_width / num_cols] * num_cols # Distribui igualmente se não houver largura definida
        else:
            total_given_width = sum(col_widths)
            if total_given_width != page_width and total_given_width > 0:
                col_widths = [cw * (page_width / total_given_width) for cw in col_widths]
            if len(col_widths) < num_cols:
                 # Adiciona larguras para colunas faltantes, distribuindo o restante
                 remaining_width = page_width - sum(col_widths)
                 if remaining_width < 0: remaining_width = 0 # Evita larguras negativas
                 num_missing_cols = num_cols - len(col_widths)
                 col_widths.extend([remaining_width / num_missing_cols] * num_missing_cols)
            elif len(col_widths) > num_cols:
                 col_widths = col_widths[:num_cols]


        table_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a627a')), # Azul escuro para o cabeçalho
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),

            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#999999')),
        ])

        # Adiciona fundo zebrado (alternado)
        for i in range(1, len(table_data)):
            if i % 2 == 0:
                table_style.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#eeeeee'))
            else:
                table_style.add('BACKGROUND', (0, i), (-1, i), colors.whitesmoke)
        
        # Ajusta alinhamento do corpo para a esquerda, se não foi definido pelo style do Paragraph
        # Esta linha pode ser removida se o 'table_body_style' já for suficiente
        table_style.add('ALIGN', (0, 1), (-1, -1), TA_LEFT) # Alinha o corpo à esquerda

        t = Table(table_data, colWidths=col_widths)
        t.setStyle(table_style)
        self.story.append(t)
        self.story.append(Spacer(1, 0.5 * cm))

    def build_pdf(self):
        try:
            self.doc.build(self.story)
            return True
        except Exception as e:
            print(f"Erro ao gerar PDF: {e}")
            return False

# --- Vercel Serverless Function POST Handler ---
# Esta função é o ponto de entrada real para a Serverless Function Python no Vercel.
# Ela recebe um objeto `request` do Werkzeug e deve retornar um objeto `Response` do Werkzeug.
def POST(request: Request):
    """
    Vercel Serverless Function handler para requisições POST.
    Recebe um objeto `Request` do Werkzeug e retorna um `Response` do Werkzeug.
    """
    try:
        # Tenta parsear o corpo da requisição como JSON
        try:
            json_data = request.get_json()
        except Exception as e:
            print(f"Erro ao parsear JSON da requisição: {e}")
            return Response(json.dumps({"error": "Corpo da requisição inválido. Esperado JSON."}), 
                            mimetype='application/json', 
                            status=400)

        if not json_data:
            return Response(json.dumps({"error": "Nenhum dado JSON fornecido"}), 
                            mimetype='application/json', 
                            status=400)

        report_type = json_data.get('type')
        report_title = json_data.get('title')
        report_content = json_data.get('content')
        filename = json_data.get('filename', 'relatorio.pdf')

        # CORREÇÃO AQUI: Garante que o tipo de relatório seja tratado consistentemente
        if report_type == "faltosos_periodo":
            report_type = "faltosos"

        if not report_type or not report_title or not report_content:
            return Response(json.dumps({"error": "Faltando report_type, title ou content"}), 
                            mimetype='application/json', 
                            status=400)

        buffer = BytesIO()
        pdf_gen = PDFGenerator(buffer)

        # --- Lógica de Geração de PDF (baseada no seu código original) ---
        pdf_gen.add_title(report_title)

        if report_type == "presenca_reuniao":
            details = report_content["reuniao_detalhes"]
            membros_presentes = report_content["membros_presentes"]
            membros_ausentes = report_content["membros_ausentes"]
            visitantes_presentes = report_content["visitantes_presentes"]

            pdf_gen.add_subsection_heading("Detalhes da Reunião:")
            pdf_gen.add_paragraph(f"Data: {format_date_for_pdf(details['data_reuniao'])}")
            pdf_gen.add_paragraph(f"Tema: {format_nullable_data(details['tema'])}")
            pdf_gen.add_paragraph(f"Ministrador 1: {format_nullable_data(details.get('ministrador_principal_nome'))}")
            if details.get('ministrador_secundario_nome'):
                pdf_gen.add_paragraph(f"Ministrador 2: {format_nullable_data(details['ministrador_secundario_nome'])}")
            if details.get('responsavel_kids_nome'):
                pdf_gen.add_paragraph(f"Responsável Kids: {format_nullable_data(details['responsavel_kids_nome'])}")
            pdf_gen.add_paragraph(f"Crianças Presentes: {format_nullable_data(details.get('num_criancas', 0))}")
            pdf_gen.story.append(Spacer(1, 0.5 * cm))

            pdf_gen.add_section_heading("Membros Presentes")
            if membros_presentes and len(membros_presentes) > 0:
                data_membros_presentes_pdf = [["Nome", "Telefone"]] + \
                                            [[format_nullable_data(m['nome']), format_phone_number_for_pdf(m['telefone'])] for m in membros_presentes]
                pdf_gen.add_table(data_membros_presentes_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum membro presente registrado.")

            pdf_gen.add_section_heading("Membros Ausentes")
            if membros_ausentes and len(membros_ausentes) > 0:
                data_membros_ausentes_pdf = [["Nome", "Telefone"]] + \
                                            [[format_nullable_data(m['nome']), format_phone_number_for_pdf(m['telefone'])] for m in membros_ausentes]
                pdf_gen.add_table(data_membros_ausentes_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum membro ausente registrado.")

            pdf_gen.add_section_heading("Visitantes Presentes")
            if visitantes_presentes and len(visitantes_presentes) > 0:
                data_visitantes_presentes_pdf = [["Nome", "Telefone"]] + \
                                                [[format_nullable_data(v['nome']), format_phone_number_for_pdf(v['telefone'])] for v in visitantes_presentes]
                pdf_gen.add_table(data_visitantes_presentes_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum visitante presente registrado.")

        elif report_type == "presenca_membro":
            membro_data = report_content["membro_data"]
            historico_presenca = report_content["historico_presenca"]

            pdf_gen.add_subsection_heading(f"Membro: {format_nullable_data(membro_data['nome'])}")
            pdf_gen.add_paragraph(f"Telefone: {format_phone_number_for_pdf(membro_data['telefone'])}")
            pdf_gen.add_paragraph(f"Data de Ingresso: {format_date_for_pdf(membro_data['data_ingresso'])}")
            if membro_data.get('data_nascimento'):
                pdf_gen.add_paragraph(f"Data de Nascimento: {format_date_for_pdf(membro_data['data_nascimento'])}")
            pdf_gen.story.append(Spacer(1, 0.5 * cm))

            pdf_gen.add_section_heading("Histórico de Presença:")
            if historico_presenca and len(historico_presenca) > 0:
                data_historico_pdf = [["Data da Reunião", "Tema", "Presente?"]] + \
                                     [[format_date_for_pdf(h['data_reuniao']), format_nullable_data(h['tema']), "Sim" if h['presente'] else "Não"]
                                      for h in historico_presenca] 
                pdf_gen.add_table(data_historico_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum histórico de presença encontrado para este membro.")

        elif report_type == "faltosos":
            faltosos = report_content["faltosos"]
            start_date = report_content["start_date"]
            end_date = report_content["end_date"]

            pdf_gen.add_paragraph(f"Período: {format_date_for_pdf(start_date)} a {format_date_for_pdf(end_date)}")
            pdf_gen.story.append(Spacer(1, 0.5 * cm))

            pdf_gen.add_section_heading("Membros Faltosos:")
            if faltosos and len(faltosos) > 0:
                data_faltosos_pdf = [["Nome", "Telefone", "Presenças", "Reuniões no Período"]] + \
                                    [[format_nullable_data(f['nome']), format_phone_number_for_pdf(f['telefone']), format_nullable_data(f['total_presencas']), format_nullable_data(f['total_reunioes_no_periodo'])]
                                     for f in faltosos]
                pdf_gen.add_table(data_faltosos_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum membro com ausência registrado neste período.")

        elif report_type == "visitantes_periodo":
            visitantes = report_content["visitantes"]
            start_date = report_content["start_date"]
            end_date = report_content["end_date"]

            pdf_gen.add_paragraph(f"Período: {format_date_for_pdf(start_date)} a {format_date_for_pdf(end_date)}")
            pdf_gen.story.append(Spacer(1, 0.5 * cm))

            pdf_gen.add_section_heading("Visitantes por Período:")
            if visitantes and len(visitantes) > 0:
                data_visitantes_pdf = [["Nome", "Telefone", "Primeira Visita"]] + \
                                        [[format_nullable_data(v['nome']), format_phone_number_for_pdf(v['telefone']), format_date_for_pdf(v['data_primeira_visita'])]
                                         for v in visitantes]
                pdf_gen.add_table(data_visitantes_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum visitante registrado neste período.")
        
        elif report_type == "aniversariantes_mes":
            membros_aniversariantes = report_content["membros"]
            visitantes_aniversariantes = report_content["visitantes"]
            
            pdf_gen.add_paragraph(f"Este relatório lista membros e visitantes que fazem aniversário no mês selecionado.")
            pdf_gen.story.append(Spacer(1, 0.5 * cm))

            pdf_gen.add_section_heading("Membros Aniversariantes:")
            if membros_aniversariantes and len(membros_aniversariantes) > 0:
                data_membros_aniversariantes_pdf = [["Nome", "Data Nasc.", "Telefone", "Célula"]] + \
                                                   [[format_nullable_data(m['nome']), format_date_for_pdf(m['data_nascimento']), format_phone_number_for_pdf(m['telefone']), format_nullable_data(m['celula_nome'])]
                                                    for m in membros_aniversariantes]
                pdf_gen.add_table(data_membros_aniversariantes_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum membro aniversariante neste mês.")

            pdf_gen.add_section_heading("Visitantes Aniversariantes:")
            if visitantes_aniversariantes and len(visitantes_aniversariantes) > 0:
                data_visitantes_aniversariantes_pdf = [["Nome", "Data Nasc.", "Telefone", "Célula"]] + \
                                                      [[format_nullable_data(v['nome']), format_date_for_pdf(v['data_nascimento']), format_phone_number_for_pdf(v['telefone']), format_nullable_data(v['celula_nome'])]
                                                       for v in visitantes_aniversariantes]
                pdf_gen.add_table(data_visitantes_aniversariantes_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum visitante aniversariante neste mês.")
        
        elif report_type == "alocacao_lideres":
            lideres_alocados = report_content["lideres_alocados"]
            lideres_nao_alocados = report_content["lideres_nao_alocados"]
            celulas_sem_lider_atribuido = report_content["celulas_sem_lider_atribuido"]
            total_perfis_lider = report_content["total_perfis_lider"]
            total_celulas = report_content["total_celulas"]

            pdf_gen.add_paragraph(f"Total de Perfis de Líder/Admin: {format_nullable_data(total_perfis_lider)}")
            pdf_gen.add_paragraph(f"Total de Células Registradas: {format_nullable_data(total_celulas)}")
            pdf_gen.story.append(Spacer(1, 0.5 * cm))

            pdf_gen.add_section_heading("Líderes Alocados em Células:")
            if lideres_alocados and len(lideres_alocados) > 0:
                data_alocados_pdf = [["Email", "Role", "Célula Associada", "Último Login"]] + \
                                    [[format_nullable_data(l['email']), format_nullable_data(l['role']), format_nullable_data(l['celula_nome']), format_date_for_pdf(l['ultimo_login'])]
                                     for l in lideres_alocados]
                pdf_gen.add_table(data_alocados_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum líder alocado em célula encontrado.")

            pdf_gen.add_section_heading("Líderes sem Célula Alocada no Perfil:")
            pdf_gen.add_paragraph("Usuários com a função 'líder' mas sem vínculo a uma célula no perfil.")
            if lideres_nao_alocados and len(lideres_nao_alocados) > 0:
                data_nao_alocados_pdf = [["Email", "Role", "Data Criação", "Último Login"]] + \
                                        [[format_nullable_data(l['email']), format_nullable_data(l['role']), format_date_for_pdf(l['data_criacao_perfil']), format_date_for_pdf(l['ultimo_login'])]
                                         for l in lideres_nao_alocados]
                pdf_gen.add_table(data_nao_alocados_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhum líder sem célula alocada encontrado.")

            pdf_gen.add_section_heading("Células sem Líder Atribuído em Perfis:")
            pdf_gen.add_paragraph("Células existentes, mas sem perfil de usuário com a função 'líder' associado.")
            if celulas_sem_lider_atribuido and len(celulas_sem_lider_atribuido) > 0:
                data_celulas_sem_lider_pdf = [["Nome da Célula", "Líder Principal (no registro da célula)"]] + \
                                             [[format_nullable_data(c['nome']), format_nullable_data(c['lider_principal_cadastrado_na_celula'])]
                                              for c in celulas_sem_lider_atribuido]
                pdf_gen.add_table(data_celulas_sem_lider_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhuma célula sem líder atribuído encontrada.")
        
        elif report_type == "chaves_ativacao":
            chaves_ativas = report_content["chaves_ativas"]
            chaves_usadas = report_content["chaves_usadas"]
            total_chaves = report_content["total_chaves"]

            pdf_gen.add_paragraph(f"Total de Chaves de Ativação Registradas: {format_nullable_data(total_chaves)}")
            pdf_gen.story.append(Spacer(1, 0.5 * cm))

            pdf_gen.add_section_heading("Chaves Ativas:")
            if chaves_ativas and len(chaves_ativas) > 0:
                data_ativas_pdf = [["Chave", "Célula Associada"]] + \
                                  [[format_nullable_data(c['chave']), format_nullable_data(c['celula_nome'])]
                                   for c in chaves_ativas]
                pdf_gen.add_table(data_ativas_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhuma chave de ativação ativa encontrada.")

            pdf_gen.add_section_heading("Chaves Usadas:")
            if chaves_usadas and len(chaves_usadas) > 0:
                data_usadas_pdf = [["Chave", "Célula Original", "Usada Por (Email)", "Data de Uso"]] + \
                                  [[format_nullable_data(c['chave']), format_nullable_data(c['celula_nome']), format_nullable_data(c['usada_por_email']), format_date_for_pdf(c['data_uso'])]
                                   for c in chaves_usadas]
                pdf_gen.add_table(data_usadas_pdf)
            else:
                pdf_gen.add_small_italic_text("Nenhuma chave de ativação usada encontrada.")
        
        else:
            pdf_gen.add_paragraph("Tipo de relatório não reconhecido.")

        pdf_gen.build_pdf()
        buffer.seek(0)

        # Retorna o Response do Werkzeug com o PDF gerado
        return Response(buffer.getvalue(), 
                        mimetype='application/pdf', 
                        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
                        status=200)

    except Exception as e:
        print(f"Erro no serviço Python (POST handler): {e}")
        return Response(json.dumps({"error": f"Erro interno do servidor Python: {str(e)}"}), 
                        mimetype='application/json', 
                        status=500)
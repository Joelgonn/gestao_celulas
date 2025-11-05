# python-service/app.py
from flask import Flask, request, send_file
from io import BytesIO
import json
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Importe suas funções de formatação
from formatters import format_phone_number_for_pdf, format_date_for_pdf, format_nullable_data

app = Flask(__name__)

# --- INÍCIO DA REFATORAÇÃO 1.1 ---
# Configuração da fonte
# O caminho para as fontes deve ser absoluto ou relativo ao diretório do script,
# e funcionar em ambiente Vercel.
# Em Vercel, os arquivos são empacotados, então usar `os.path.dirname(__file__)` é a forma mais robusta.
FONT_FOLDER = os.path.join(os.path.dirname(__file__), 'fonts')
DEFAULT_FONT_NORMAL = 'DejaVuSans'
DEFAULT_FONT_BOLD = 'DejaVuSans-Bold'

try:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    
    # Registra a fonte DejaVu Sans (normal e bold)
    pdfmetrics.registerFont(TTFont(DEFAULT_FONT_NORMAL, os.path.join(FONT_FOLDER, 'DejaVuSans.ttf')))
    pdfmetrics.registerFont(TTFont(DEFAULT_FONT_BOLD, os.path.join(FONT_FOLDER, 'DejaVuSans-Bold.ttf')))
    
    # Mapeamento para que ReportLab use suas fontes para estilos "normal" e "bold"
    from reportlab.lib.fonts import addMapping
    addMapping(DEFAULT_FONT_NORMAL, 0, 0, DEFAULT_FONT_NORMAL) # Normal (peso 0, itálico 0)
    addMapping(DEFAULT_FONT_NORMAL, 1, 0, DEFAULT_FONT_BOLD) # Bold (peso 1, itálico 0)
    
except Exception as e:
    print(f"AVISO: Não foi possível registrar as fontes personalizadas. Usando Helvetica. Erro: {e}")
    DEFAULT_FONT_NORMAL = 'Helvetica'
    DEFAULT_FONT_BOLD = 'Helvetica-Bold'
# --- FIM DA REFATORAÇÃO 1.1 ---

class PDFGenerator:
    def __init__(self, buffer_obj):
        self.buffer = buffer_obj
        self.doc = SimpleDocTemplate(buffer_obj, pagesize=A4,
                                     rightMargin=2 * cm, leftMargin=2 * cm,
                                     topMargin=2 * cm, bottomMargin=2 * cm)
        self.styles = getSampleStyleSheet()
        self.story = []

        # Configuração dos Estilos Personalizados
        # --- INÍCIO DA REFATORAÇÃO 1.2: Aplicar as fontes padrão configuradas ---
        self.styles['Title'].fontName = DEFAULT_FONT_BOLD # Título em negrito
        self.styles['Title'].fontSize = 18
        self.styles['Title'].leading = 22
        self.styles['Title'].alignment = TA_CENTER
        self.styles['Title'].spaceAfter = 15
        self.styles['Title'].textColor = colors.black

        self.styles.add(ParagraphStyle(name='Celula_SectionHeading',
                                       parent=self.styles['Normal'],
                                       fontName=DEFAULT_FONT_BOLD, # Seções em negrito
                                       fontSize=14,
                                       leading=18,
                                       spaceAfter=10,
                                       textColor=colors.HexColor('#e67e22'))) # Laranja
        
        self.styles.add(ParagraphStyle(name='Celula_SubSectionHeading',
                                       parent=self.styles['Normal'],
                                       fontName=DEFAULT_FONT_BOLD, # Subseções em negrito
                                       fontSize=12,
                                       leading=15,
                                       spaceAfter=7,
                                       textColor=colors.HexColor('#f39c12'))) # Laranja mais claro

        self.styles.add(ParagraphStyle(name='Celula_NormalParagraph',
                                       parent=self.styles['Normal'],
                                       fontName=DEFAULT_FONT_NORMAL, # Parágrafos com fonte normal
                                       fontSize=10,
                                       leading=12,
                                       alignment=TA_LEFT,
                                       textColor=colors.black))

        self.styles.add(ParagraphStyle(name='Celula_SmallItalicText',
                                       parent=self.styles['Normal'],
                                       fontName=DEFAULT_FONT_NORMAL, # Texto pequeno em itálico com fonte normal
                                       fontSize=9,
                                       leading=11,
                                       textColor=colors.HexColor('#666666')))

        # Estilos para tabela
        self.table_header_style = self.styles['Normal'].clone('table_header_style', fontName=DEFAULT_FONT_BOLD, fontSize=10, alignment=TA_CENTER)
        self.table_body_style = self.styles['Normal'].clone('table_body_style', fontName=DEFAULT_FONT_NORMAL, fontSize=9, alignment=TA_LEFT)
        # --- FIM DA REFATORAÇÃO 1.2 ---


    def add_title(self, text):
        self.story.append(Paragraph(f"<b>{text}</b>", self.styles['Title']))
        self.story.append(Spacer(1, 0.5 * cm))

    def add_section_heading(self, text):
        self.story.append(Paragraph(f"<b>{text}</b>", self.styles['Celula_SectionHeading']))
        self.story.append(Spacer(1, 0.2 * cm))

    def add_subsection_heading(self, text):
        self.story.append(Paragraph(f"<b>{text}</b>", self.styles['Celula_SubSectionHeading']))
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
                 col_widths.extend([page_width / num_cols] * (num_cols - len(col_widths)))
            elif len(col_widths) > num_cols:
                 col_widths = col_widths[:num_cols]


        table_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a627a')), # Azul escuro para o cabeçalho
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'), # Alinha todo o texto da tabela ao centro por padrão
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),

            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#999999')),
        ])

        # Adiciona fundo zebrado (alternado)
        for i in range(1, len(table_data)):
            if i % 2 == 0:
                table_style.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#eeeeee'))
            else:
                table_style.add('BACKGROUND', (0, i), (-1, i), colors.whitesmoke)
        
        # Ajusta alinhamento do corpo para a esquerda (após o 'CENTER' geral)
        table_style.add('ALIGN', (0, 1), (-1, -1), 'LEFT') 

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

# Endpoint para gerar PDF
@app.route('/generate-report-pdf', methods=['POST'])
def generate_report_pdf_endpoint():
    data = request.json
    if not data:
        return {"error": "No JSON data provided"}, 400

    report_type = data.get('type')
    report_title = data.get('title')
    report_content = data.get('content')
    filename = data.get('filename', 'relatorio.pdf')

    # CORREÇÃO AQUI: O tipo de relatório 'faltosos_periodo' no frontend
    # corresponde a 'faltosos' no backend Python (seu código original do app.py já fazia isso)
    if report_type == "faltosos_periodo":
        report_type = "faltosos"


    if not report_type or not report_title or not report_content:
        return {"error": "Missing report_type, title or content"}, 400

    buffer = BytesIO()
    pdf_gen = PDFGenerator(buffer)

    try:
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

        elif report_type == "faltosos": # Corrigido para 'faltosos' conforme o frontend
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
        
        # --- INÍCIO NOVO: Tratamento para relatório de Chaves de Ativação ---
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
        # --- FIM NOVO ---
        
        else:
            pdf_gen.add_paragraph("Tipo de relatório não reconhecido.")

        pdf_gen.build_pdf()
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        print(f"Erro no serviço Python: {e}")
        return {"error": f"Erro interno do servidor Python: {str(e)}"}, 500

if __name__ == '__main__':
    # Obtém a porta do ambiente ou usa uma padrão
    port = int(os.environ.get('PORT', 5000))
    # Para desenvolvimento, use debug=True. Em produção, use um WSGI server como Gunicorn.
    app.run(host='0.0.0.0', port=port, debug=True)
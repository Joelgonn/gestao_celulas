# python-service/formatters.py
from datetime import datetime

def format_phone_number_for_pdf(number_str):
    if not number_str: return ""
    digits = "".join(filter(str.isdigit, number_str))

    if len(digits) == 11:
        return f"({digits[0:2]}) {digits[2:7]}-{digits[7:11]}"
    elif len(digits) == 10:
        return f"({digits[0:2]}) {digits[2:6]}-{digits[6:10]}"
    return number_str

def format_date_for_pdf(date_str):
    if not date_str: return ""
    try:
        # Assumindo formato 'YYYY-MM-DD' para entrada (padrão de campos date em HTML e DB)
        dt_obj = datetime.strptime(date_str, "%Y-%m-%d")
        return dt_obj.strftime("%d/%m/%Y")
    except ValueError:
        return date_str # Retorna a string original se o formato não for o esperado

# --- INÍCIO DA REFATORAÇÃO 1.3 ---
def format_nullable_data(data):
    """Retorna a string vazia se o dado for None, string vazia ou outros valores considerados 'vazios',
       caso contrário, retorna a representação em string do dado."""
    if data is None:
        return ""
    if isinstance(data, str) and not data.strip(): # Verifica se é uma string vazia ou só com espaços
        return ""
    # Você pode adicionar outras condições aqui se precisar tratar outros tipos de "vazio"
    # Ex: if isinstance(data, (int, float)) and data == 0: return ""
    return str(data)
# --- FIM DA REFATORAÇÃO 1.3 ---
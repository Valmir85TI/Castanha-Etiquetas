import os
import secrets
import sys
import time
import requests
import hmac
import hashlib
import base64
import json
from datetime import datetime
from decimal import Decimal
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from zebra import Zebra

# Carrega variáveis de ambiente de um arquivo .env local (se existir).
# Em produção (Docker), as variáveis já vêm do ambiente do container.
load_dotenv()

# Instância da aplicação FastAPI
app = FastAPI(title="Sistema de Impressão de Etiquetas - Backend")

# Configuração de CORS para permitir requisições do frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar a URL do frontend
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurações da API Bluesoft e da área de gerência.
# Todos os valores sensíveis vêm de variáveis de ambiente (veja .env.example);
# nada de credencial real deve ficar hardcoded no código-fonte.
BLUESOFT_TOKEN = os.environ["BLUESOFT_TOKEN"]
BLUESOFT_HEADERS = {
    "X-Customtoken": BLUESOFT_TOKEN,
    "Content-Type": "application/json"
}
BLUESOFT_PRODUTOS_URL = "https://erp.bluesoft.com.br/castanha/api/comercial/produtos"
BLUESOFT_PRECOS_URL = "https://erp.bluesoft.com.br/castanha/api/vendas/precos"
BLUESOFT_ETIQUETAS_URL = "https://erp.bluesoft.com.br/castanha/api/precos-para-impressao-etiqueta"

GERENCIA_USUARIO = os.environ["GERENCIA_USUARIO"]
GERENCIA_SENHA = os.environ["GERENCIA_SENHA"]
GERENCIA_SESSION_DURATION_SECONDS = 8 * 60 * 60
SECRET_KEY = os.environ["SECRET_KEY"]
TIPOS_CONSULTA_ETIQUETA = {"PRECO_ATUAL", "PRECO_A_VIGORAR"}

class PrinterTemplates:
    """
    Classe responsável por armazenar e formatar os templates ZPL (Zebra Programming Language).
    """
    @staticmethod
    def get_inteira(descricao, codigo_formatado, cod_interno, preco, preco_medida, unidade_medida):
        data_atual = datetime.today().strftime('%d/%m/%Y')
        return f"""^XA
^FO3,75^GFA,2610,2610,29,,O04,,:::Q08,P01,,R0F,P03IF8,P03IFE,P03JF8,O041F83FC,N09F9C00FE,M01BFFI07F,M07FFEI07F8,M0IFCI03FC,L03IFJ03FC,L07FFEJ03FE,L0IFCJ03FE,K01IF8J03FEgO0F8,K03IFK03FFgN03FC,K07FFEK03FFgN07FC,K0IFEK03FFgN0FFC,J01IFCK07FFgN0FCC,J03IF8K07FFgM01F8C,J03IFL07FER02T03F0C,J07IFL0FFEQ07ET03F1C,J0IFEL0FFEQ0FCT07E18,J0IFCK01FFEQ0FCT07E18,I01IFCK01FFCP01FCT0FC3,I03IF8K03FFCP01F8T0FC3,I03IF8K07FFCP01F8S01FC6,I07IFI0800IF8P01F8S01F8C,I07IF001C03IF8P03F8S01F8C,I0IFE003E07IF03F07I0F00IF003F0300781E03F99FI03F07,I0IFE003LF0FF9E003F01IF00FF8F01F87F03F33F800FF9E,001IFC003KFE3E1FE003F01FFE01F0FF01F0FF83F7FF803E1FE,001IFC003KFC7C1FE007F01FFE03E0FE03F1FF87JF807C1FE,001IFC003KF8F81FC007F00FE007C0FE03F3FF07FF3F80FC0FC,003IF8003KF1F81FC00FF80FE00F80FE03E63F07FC3F01F80FC,003IF8003JFE3F01FC00FF80FC01F80FC07EC7F07F83F01F01FC,003IF8001JFC3F01FC019FC0FC01F00FC07F87E0FF03F03F01FC,007IFJ0JF07E01F8031FC0FC03F01FC07F87E0FE07F07E01F8,007IFJ03FFC07E01F8070FE1FC03F01FC0FF0FE0FC07E07E01F8,007FBFK0FF00FE03F80607E1F807E01F80FE0FC0FC07E07E03F8,007F1FO0FE03F80C07E1F807E03F80FC0FC0FC0FE0FE03F8,00F01FO0FC07F01803C1F807E03F81FC1FC0FC0FC0FC07F,00F807O0FC07F03003C3F80FE07F83F81F81FC0FC1FC07F02,00FC06O0FC0FF07003C3F81FE07F87F81F83FC1FC3FC0FF06,00F80EO0FE1FF0E60387F83FE0DF8FF81F87FC1F87FE1FF0E,00F81EO0FF3BFFCF071FFCF7FB9FDDF81F8EFC1FCEFF3BFBC,00F91EO0IF3FF9F07F9FFE7FF1FF9F81FFCFC1FFC7FF3FF8,00FF9EO07FE1FE1F9FE1FF83FE1FF1F81FF8FC1FF87FE1FE,00JFO07FC1FC1IF80FF03FC0FE1F81FE0FC1FE03FC1FC,00JFO03F00F80FF8007C01F80F80F00FC0F00FC01F80F8,00JF,007IFX06,007IFS07FFC198g03L07E,007IF8Q01JFB18g03K0380C,007IF8Q0FF001FgH03K0C006,003IFCP03F8I03gH07J01I02,003IFCP0FEJ038gG06J02I02,001IFEO03FCJ01C3183E1CC8DCE1CC8F0EC7E1E0040404,001JFO0FFK01E3187F26C9FDE64D99198C637008180C,I0JF8M03FCL07738E364F9CEE4CF10318CI60081C1,I0JFCM0FF8L07630E36CB19CCD8B307398E660081FE,I07IFEL03FEL083631E7E0B39CCE13306398C66008,I03JF8J01FFCL0C3E72C7E13399DE2778E739CE77F8,I03KFJ0IFM0C7FBCC67E3F99EFC7BF7BDEF7400C,I01LF007FFCM07C738F8383318C7831E318C63800E,J0LF807FF8R0CgH06,J03KFE07FER01C,J01KFE03FCR018,K07JFE3BFS018,K03JFE7FC,L0MF,L01KF8,M01IF8,,:::::::::^FS
^LL1^FO30,15^A0N,63,27^FD{descricao}^FS
^FO230,95^BCN,55,Y,N,N^SN{codigo_formatado}^FS
^FO103,198^A0N,17,18^FD{data_atual}^FS
^FO680,198^A0N,16,18^FD{cod_interno}^FS
^FO640,75^A0N,115,60^FD{preco}^FS
^FO605,115^A0N,35,35^FDR$^FS
^FO320,190^A0N,30,20^FDValor de:1 {unidade_medida}^FS
^FO455,190^A0N,15,15^FDR$^FS
^FO480,190^A0N,37,17^FD{preco_medida}^FS
^PQ1,0,1,N^FS^XZ"""

    @staticmethod
    def get_meia(descricao, codigo, preco, preco_medida, unidade_medida):
        data_atual = datetime.today().strftime('%d/%m/%y')
        return f"""^XA^LH10,5^FS^LL240^FS^JMA^FS^FO5,15^FB390,2,0,L,0^A0N,45,22^FD{descricao}^FS
^FO425,15^FB390,2,0,L,0^A0N,45,22^FD{descricao}^FS
^FO70,200^A0N,18,18^FD{data_atual}^FS
^FO45,195^A0N15,15^FDValor de:1 {unidade_medida}^FS
^FO150,195^A0N,15,15^FDR$^FS
^FO175,185^A0N,37,17^FD{preco_medida}^FS
^FO455,200^A0N15,15^FDValor de:1 {unidade_medida}^FS
^FO555,200^A0N,15,15^FDR$^FS
^FO580,185^A0N,37,17^FD{preco_medida}^FS
^FO25,110^BE,40,Y^FD{codigo}^FS
^FO430,110^BE,40,Y^FD{codigo}^FS
^FS^FO225,135^A0N,30,28^FDR$^FS^FO625,130^A0N,30,28^FDR$^FS
^FO260,135^A0N,100,57^FD{preco}^FS
^FO660,130^A0N,100,57^FD{preco}^FS^PQ1,,,N^XZ"""

    @staticmethod
    def get_carreiras(descricao, codigo):
        return f"""^XA
^LL250^FS
^FO55,20^A0N,40,13^FD{descricao[:25]}^FS
^FO55,55^BEN,70,Y^FD{codigo}^FS
^FO80,155^A0N,30,30^FDCASTANHA^FS
^FO50,180^A0N,30,30^FDSUPERMERCADO^FS

^FO320,20^A0N,40,13^FD{descricao[:25]}^FS
^FO320,55^BEN,70,Y^FD{codigo}^FS
^FO340,155^A0N,30,35^FDCASTANHA^FS
^FO315,180^A0N,30,30^FDSUPERMERCADO^FS

^FO595,20^A0N,40,13^FD{descricao[:25]}^FS
^FO595,55^BEN,70,Y^FD{codigo}^FS
^FO620,155^A0N,30,35^FDCASTANHA^FS
^FO590,180^A0N,30,30^FDSUPERMERCADO^FS
^PQ1,0,1,N^FS^XZ"""

class PrintRequest(BaseModel):
    codigo_barras: str
    cod_interno: str
    quantidade: int
    tipo_etiqueta: str
    descricao: Optional[str] = None
    preco: Optional[str] = None
    preco_unidade: Optional[str] = None
    unidade_medida: Optional[str] = None

class BatchPrintRequest(BaseModel):
    etiquetas: List[PrintRequest]

class GerenciaLoginRequest(BaseModel):
    usuario: str
    senha: str

def obter_impressora_padrao():
    """Lê a configuração da impressora."""
    if hasattr(sys, '_MEIPASS'):
        caminho_arquivo = os.path.join(sys._MEIPASS, 'frontend', 'public', 'impressoras.txt')
    else:
        caminho_arquivo = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'impressoras.txt')
    try:
        with open(caminho_arquivo, 'r') as file:
            return file.read().strip()
    except FileNotFoundError:
        return "Impressora_Padrao"

def formatar_preco(valor):
    if valor is None:
        return "0,00"
    return f"{float(valor):.2f}".replace('.', ',')

def normalizar_data_vigorar(data_vigorar: Optional[str]):
    if not data_vigorar:
        return None

    try:
        return datetime.strptime(data_vigorar, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return data_vigorar

def criar_sessao_gerencia():
    expira_em = time.time() + GERENCIA_SESSION_DURATION_SECONDS
    payload = {"user": GERENCIA_USUARIO, "exp": expira_em}
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    token = f"{payload_b64}.{signature}"
    return token, int(expira_em * 1000)

def validar_sessao_gerencia(token: Optional[str]):
    is_valid = False
    if token:
        try:
            payload_b64, signature = token.split('.')
            expected_sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
            if hmac.compare_digest(expected_sig, signature):
                payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
                if payload.get("exp", 0) > time.time():
                    is_valid = True
        except Exception:
            pass
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Acesso de gerencia expirado ou invalido.")

@app.post("/gerencia/login")
def autenticar_gerencia(req: GerenciaLoginRequest):
    if req.usuario == GERENCIA_USUARIO and req.senha == GERENCIA_SENHA:
        token, expira_em = criar_sessao_gerencia()
        return {"status": "autenticado", "token": token, "expiresAt": expira_em}

    raise HTTPException(status_code=401, detail="Usuario ou senha invalidos.")

@app.get("/precos-para-impressao-etiqueta")
def buscar_precos_para_impressao_etiqueta(
    tipoConsultaProduto: str = "PRECO_ATUAL",
    dataVigorar: Optional[str] = None,
    x_gerencia_token: Optional[str] = Header(default=None, alias="X-Gerencia-Token"),
):
    validar_sessao_gerencia(x_gerencia_token)

    if tipoConsultaProduto not in TIPOS_CONSULTA_ETIQUETA:
        raise HTTPException(status_code=400, detail="Tipo de consulta invalido.")

    data_vigorar = normalizar_data_vigorar(dataVigorar)
    if tipoConsultaProduto == "PRECO_A_VIGORAR" and not data_vigorar:
        raise HTTPException(status_code=400, detail="Informe a data para consultar preco a vigorar.")
    
    if not data_vigorar:
        data_vigorar = datetime.today().strftime("%d/%m/%Y")

    params = {
        "lojaKey": 1,
        "page": 0,
        "pageSize": 500,
        "tipoConsultaProduto": tipoConsultaProduto,
        "dataVigorar": data_vigorar
    }

    try:
        resp = requests.get(BLUESOFT_ETIQUETAS_URL, headers=BLUESOFT_HEADERS, params=params, timeout=20)
    except requests.exceptions.RequestException as e:
        print(f"Erro ao consultar API de precos para etiqueta: {e}")
        raise HTTPException(status_code=502, detail="Erro ao consultar a API da Bluesoft.")

    if resp.status_code >= 400:
        try:
            detail = resp.json()
            if "erros" in detail:
                detail = detail["erros"][0].get("mensagem", detail)
        except ValueError:
            detail = resp.text
        # Evitar retornar 401 para o frontend nao deslogar a sessao da gerencia
        status_to_return = resp.status_code if resp.status_code != 401 else 502
        raise HTTPException(status_code=status_to_return, detail=detail)

    return resp.json()

@app.get("/produto/{codigo}")
def buscar_produto(codigo: str):
    """
    Busca o produto na API da Bluesoft.
    Tenta primeiro pelo GTIN (se parecer código de barras), depois por produtoKey.
    """
    produto = None
    codigo_busca = codigo
    
    # Tratamento para etiquetas de balança (começam com 2)
    if codigo_busca.startswith('2') and len(codigo_busca) > 5 and len(codigo_busca) != 14:
        codigo_busca = codigo_busca[1:5]
        
    # Tentativa 1: Buscar por produtoKey (Código interno)
    if codigo_busca.isdigit():
        try:
            resp = requests.get(f"{BLUESOFT_PRODUTOS_URL}?produtoKey={codigo_busca}", headers=BLUESOFT_HEADERS, timeout=10)
            if resp.status_code == 200:
                data = resp.json().get('data', [])
                if data:
                    produto = data[0]
        except requests.exceptions.RequestException as e:
            print(f"Erro ao consultar API Bluesoft (produtoKey): {e}")

    # Tentativa 2: Buscar por GTIN
    if not produto and codigo_busca.isdigit():
        try:
            resp = requests.get(f"{BLUESOFT_PRODUTOS_URL}?gtin={codigo_busca}", headers=BLUESOFT_HEADERS, timeout=10)
            if resp.status_code == 200:
                data = resp.json().get('data', [])
                if data:
                    produto = data[0]
        except requests.exceptions.RequestException as e:
            print(f"Erro ao consultar API Bluesoft (GTIN): {e}")
            
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado na API Comercial da Bluesoft")

    produto_key = produto.get('produtoKey')
    descricao = produto.get('descricao', 'SEM DESCRICAO')
    gtin_principal = produto.get('gtinPrincipal', codigo)
    qtd_embalagem = produto.get('quantidadeEmbalagemVenda', 1)
    
    # A unidade de medida segundo a requisição (usando tipoUnidadeMedida ou embalagemKey ou caindo no gtinPrincipal caso necessário)
    unidade_medida = produto.get('tipoUnidadeMedida', {}).get('tipoUnidadeMedidaKey') or produto.get('embalagemKey') or produto.get('gtinPrincipal')
    
    # Buscar Preço
    preco_em_vigor = 0.0
    try:
        resp_preco = requests.get(f"{BLUESOFT_PRECOS_URL}?lojaKey=1&produtoKey={produto_key}", headers=BLUESOFT_HEADERS, timeout=10)
        if resp_preco.status_code == 200:
            data_preco = resp_preco.json().get('data', [])
            if data_preco:
                preco_em_vigor = data_preco[0].get('precoEmVigor', 0.0)
    except requests.exceptions.RequestException as e:
        print(f"Erro ao consultar API de Preços: {e}")
        
    preco_str = formatar_preco(preco_em_vigor)
    
    # Calcular preço por unidade de medida
    preco_medida = 0.0
    if qtd_embalagem and float(qtd_embalagem) > 0:
        preco_medida = float(preco_em_vigor) / float(qtd_embalagem)
        
    preco_medida_str = formatar_preco(preco_medida)

    return {
        "descricao": descricao,
        "preco": preco_str,
        "codigo_barras": gtin_principal,
        "cod_interno": str(produto_key),
        "unidade_medida": unidade_medida,
        "preco_unidade": preco_medida_str
    }

def montar_zpl_lote(req: PrintRequest):
    if req.descricao and req.preco:
        descricao = req.descricao
        preco_str = req.preco
        codigo_barras = req.codigo_barras or req.cod_interno
        cod_interno = req.cod_interno or codigo_barras
        unidade_medida = req.unidade_medida or "UN"
        preco_medida_str = req.preco_unidade or req.preco
    else:
        try:
            produto = buscar_produto(req.codigo_barras)
        except HTTPException:
            produto = buscar_produto(req.cod_interno)

        descricao = req.descricao or produto["descricao"]
        preco_str = req.preco or produto["preco"]
        codigo_barras = produto["codigo_barras"]
        cod_interno = produto["cod_interno"]
        unidade_medida = req.unidade_medida or produto["unidade_medida"]
        preco_medida_str = req.preco_unidade or produto["preco_unidade"]

    codigo_zfill = str(codigo_barras).strip().zfill(13)

    if req.tipo_etiqueta == "Inteira":
        return PrinterTemplates.get_inteira(
            descricao, codigo_zfill, cod_interno, preco_str, preco_medida_str, unidade_medida
        )

    if req.tipo_etiqueta == "Meia":
        return PrinterTemplates.get_meia(
            descricao, codigo_barras, preco_str, preco_medida_str, unidade_medida
        )

    if req.tipo_etiqueta == "Carreiras":
        return PrinterTemplates.get_carreiras(descricao, codigo_barras)

    if req.tipo_etiqueta == "Editavel":
        if hasattr(sys, '_MEIPASS'):
            caminho_editavel = os.path.join(sys._MEIPASS, 'frontend', 'public', 'Etiqueta_editavel.txt')
        else:
            caminho_editavel = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'Etiqueta_editavel.txt')

        try:
            with open(caminho_editavel, 'r') as file:
                return file.read()
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="Template editavel nao encontrado no diretorio public do frontend.")

    raise HTTPException(status_code=400, detail=f"Tipo de etiqueta '{req.tipo_etiqueta}' invalido.")

@app.post("/gerar_zpl")
def gerar_zpl(req: PrintRequest):
    """
    Gera o ZPL correspondente ao tipo de etiqueta e retorna para o Frontend 
    (que encaminhará ao Agente Local).
    """
    try:
        # Refazendo a busca do preço para a impressão, ou podemos confiar nos dados do Request.
        # Aqui, como o frontend envia apenas codigos, buscamos novamente para garantir a integridade.
        try:
            produto = buscar_produto(req.codigo_barras)
        except HTTPException:
            produto = buscar_produto(req.cod_interno)
        
        descricao = req.descricao or produto["descricao"]
        preco_str = req.preco or produto["preco"]
        codigo_barras = produto["codigo_barras"]
        cod_interno = produto["cod_interno"]
        unidade_medida = req.unidade_medida or produto["unidade_medida"]
        preco_medida_str = req.preco_unidade or produto["preco_unidade"]
        
        codigo_zfill = str(codigo_barras).strip().zfill(13)
        
        zpl_payload = ""
        if req.tipo_etiqueta == "Inteira":
            zpl_payload = PrinterTemplates.get_inteira(
                descricao, codigo_zfill, cod_interno, preco_str, preco_medida_str, unidade_medida
            )
        elif req.tipo_etiqueta == "Meia":
            zpl_payload = PrinterTemplates.get_meia(
                descricao, codigo_barras, preco_str, preco_medida_str, unidade_medida
            )
        elif req.tipo_etiqueta == "Carreiras":
            zpl_payload = PrinterTemplates.get_carreiras(descricao, codigo_barras)
        elif req.tipo_etiqueta == "Editavel":
            # Leitura do template editavel
            if hasattr(sys, '_MEIPASS'):
                caminho_editavel = os.path.join(sys._MEIPASS, 'frontend', 'public', 'Etiqueta_editavel.txt')
            else:
                caminho_editavel = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'Etiqueta_editavel.txt')
            
            try:
                with open(caminho_editavel, 'r') as file:
                    zpl_payload = file.read()
            except FileNotFoundError:
                raise HTTPException(status_code=500, detail="Template editável não encontrado no diretório public do frontend.")
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de etiqueta '{req.tipo_etiqueta}' inválido.")

        return {"status": "sucesso", "zpl_payload": zpl_payload, "quantidade": req.quantidade}
    
    except Exception as e:
        print(f"Erro na geração do ZPL: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao gerar etiqueta: {str(e)}")

@app.post("/gerar_zpl_lote")
def gerar_zpl_lote(req: BatchPrintRequest):
    """
    Gera um unico payload RAW com varias etiquetas para enviar ao agente local em um so trabalho.
    """
    if not req.etiquetas:
        raise HTTPException(status_code=400, detail="Nenhuma etiqueta informada para impressao.")

    try:
        zpls = []

        for etiqueta in req.etiquetas:
            if etiqueta.quantidade < 1:
                raise HTTPException(status_code=400, detail="Quantidade deve ser maior que zero.")

            zpl = montar_zpl_lote(etiqueta)
            zpls.extend([zpl] * etiqueta.quantidade)

        return {"status": "sucesso", "zpl_payload": "\n".join(zpls), "quantidade": 1}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro na geracao do ZPL em lote: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao gerar etiquetas em lote: {str(e)}")

@app.get("/impressoras")
def listar_impressoras():
    """
    Retorna a lista de impressoras disponíveis.
    """
    try:
        import sys
        if sys.platform == "win32":
            import win32print
            printers = [printer[2] for printer in win32print.EnumPrinters(2)]
            return printers
        else:
            # Em Linux/Docker, listar impressoras via CUPS ou retornar a configurada
            return [obter_impressora_padrao()]
    except Exception as e:
        print(f"Erro ao listar impressoras: {e}")
        # Retorna a impressora configurada como fallback
        return [obter_impressora_padrao()]

# --- INTEGRAÇÃO COM FRONTEND (PRODUÇÃO) ---
frontend_dist = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
# Quando compilado com PyInstaller, _MEIPASS é a raiz temporal onde os arquivos são extraídos.
if hasattr(sys, '_MEIPASS'):
    frontend_dist = os.path.join(sys._MEIPASS, 'frontend', 'dist')

if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, 'assets')), name="assets")
    
    @app.get("/{catchall:path}", include_in_schema=False)
    def serve_frontend(catchall: str):
        file_path = os.path.join(frontend_dist, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, 'index.html'))

if __name__ == "__main__":
    import uvicorn
    # Em produção (PyInstaller) não usamos reload=True
    is_frozen = hasattr(sys, 'frozen')
    if is_frozen:
        # Tenta abrir o navegador automaticamente
        import webbrowser
        import threading
        threading.Timer(1.5, lambda: webbrowser.open("http://localhost:8000")).start()
        uvicorn.run(app, host="0.0.0.0", port=8000)
    else:
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

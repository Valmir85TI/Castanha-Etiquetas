import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Agente Local de Impressão")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RawPrintRequest(BaseModel):
    zpl_payload: str
    quantidade: int

@app.middleware("http")
async def add_private_network_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

def obter_impressora_padrao():
    # Lê do impressoras.txt que fica ao lado do executável
    caminho = 'impressoras.txt'
    if hasattr(sys, '_MEIPASS'):
        caminho = os.path.join(sys._MEIPASS, 'impressoras.txt')
        
    try:
        with open(caminho, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        # Tenta buscar no diretório do executável
        if getattr(sys, 'frozen', False):
            caminho_exe = os.path.join(os.path.dirname(sys.executable), 'impressoras.txt')
            try:
                with open(caminho_exe, 'r') as f:
                    return f.read().strip()
            except:
                pass
        return "ZDesigner S4M-203dpi ZPL"

def listar_impressoras_windows():
    import win32print
    flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
    return [printer[2] for printer in win32print.EnumPrinters(flags)]

def validar_impressora_configurada(impressora):
    impressoras = listar_impressoras_windows()
    if impressora in impressoras:
        return

    lista = ", ".join(impressoras) if impressoras else "nenhuma impressora instalada"
    raise RuntimeError(
        f"Impressora configurada '{impressora}' nao encontrada no Windows. "
        f"Impressoras disponiveis: {lista}"
    )

def imprimir_windows_raw(impressora, zpl_payload, quantidade):
    import win32print

    validar_impressora_configurada(impressora)
    payload = zpl_payload.encode("utf-8")
    hprinter = win32print.OpenPrinter(impressora)

    try:
        for _ in range(quantidade):
            job = win32print.StartDocPrinter(hprinter, 1, ("Etiqueta Castanha", None, "RAW"))
            try:
                win32print.StartPagePrinter(hprinter)
                win32print.WritePrinter(hprinter, payload)
                win32print.EndPagePrinter(hprinter)
            finally:
                win32print.EndDocPrinter(hprinter)
    finally:
        win32print.ClosePrinter(hprinter)

@app.post("/imprimir_raw")
def imprimir_raw(req: RawPrintRequest):
    try:
        if req.quantidade < 1:
            raise ValueError("Quantidade deve ser maior que zero.")

        impressora = obter_impressora_padrao()

        if sys.platform == "win32":
            imprimir_windows_raw(impressora, req.zpl_payload, req.quantidade)
        else:
            from zebra import Zebra
            zebra_printer = Zebra(impressora)
            for _ in range(req.quantidade):
                zebra_printer.output(req.zpl_payload)

        return {"status": "sucesso", "mensagem": "Impresso com sucesso via Agente Local"}
    except Exception as e:
        print(f"Erro no agente local: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/impressoras")
def listar_impressoras():
    try:
        if sys.platform == "win32":
            return listar_impressoras_windows()
        return [obter_impressora_padrao()]
    except Exception as e:
        return [obter_impressora_padrao()]

@app.get("/status")
def status():
    return {
        "status": "online",
        "impressora_configurada": obter_impressora_padrao(),
        "impressoras": listar_impressoras(),
    }

if __name__ == "__main__":
    import uvicorn
    import sys
    import os
    
    # Previne erro do Uvicorn (isatty) ao rodar com --noconsole no PyInstaller
    if sys.stdout is None:
        sys.stdout = open(os.devnull, 'w')
    if sys.stderr is None:
        sys.stderr = open(os.devnull, 'w')
        
    # Roda na porta 8001 para não conflitar com nada
    uvicorn.run(app, host="127.0.0.1", port=8001, log_config=None)

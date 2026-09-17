/**
 * api.js
 * 
 * Módulo de serviço HTTP responsável por encapsular todas as chamadas
 * à API do backend FastAPI. Utiliza axios com configuração centralizada
 * para garantir consistência nas requisições (baseURL, headers, timeout).
 * 
 * @module services/api
 */

import axios from 'axios';

export const GERENCIA_ACCESS_KEY = 'castanha-gerencia-autorizada-ate';
export const GERENCIA_TOKEN_KEY = 'castanha-gerencia-token';

/**
 * Instância para comunicação com o Servidor Central (Backend na Nuvem/Rede).
 * Ele vai cuidar da lógica de negócio, consultas e formatação do ZPL.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Instância para comunicação com o Agente Local (PC do Usuário).
 * Ele vai apenas receber o ZPL pronto e jogar para a impressora USB.
 */
const localApi = axios.create({
  baseURL: 'http://localhost:8001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getAgentErrorMessage = (error) => {
  const detail = error?.response?.data?.detail;
  if (detail) {
    return `Erro no Agente Local de Impressao: ${detail}`;
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Erro de comunicacao com o Agente Local de Impressao. Certifique-se de que o Agente.exe esta rodando no computador que tem a impressora USB.';
  }

  return 'Erro inesperado ao comunicar com o Agente Local de Impressao.';
};

/**
 * Busca um produto no banco de dados utilizando o código de barras.
 */
export const buscarProduto = async (codigo) => {
  const response = await api.get(`/produto/${codigo}`);
  return response.data;
};

export const autenticarGerencia = async (credenciais) => {
  const response = await api.post('/gerencia/login', credenciais);
  return response.data;
};

export const buscarPrecosParaImpressaoEtiqueta = async ({ tipoConsultaProduto, dataVigorar }) => {
  const params = { tipoConsultaProduto };
  const token = localStorage.getItem(GERENCIA_TOKEN_KEY);

  if (dataVigorar) {
    params.dataVigorar = dataVigorar;
  }

  const response = await api.get('/precos-para-impressao-etiqueta', {
    params,
    headers: token ? { 'X-Gerencia-Token': token } : {},
  });
  return response.data;
};

/**
 * Envia uma solicitação de impressão.
 * O fluxo agora é: 
 * 1. Pede o ZPL formatado para o Servidor Central.
 * 2. Envia o ZPL cru para o Agente Local imprimir na USB.
 */
export const imprimirEtiqueta = async (dados) => {
  // 1. Gera o ZPL no Servidor Central
  const responseZpl = await api.post('/gerar_zpl', dados);
  const zpl_payload = responseZpl.data.zpl_payload;
  const quantidade = responseZpl.data.quantidade;
  
  // 2. Despacha o ZPL bruto para o Agente Local no PC do usuário
  try {
    const responsePrint = await localApi.post('/imprimir_raw', { zpl_payload, quantidade });
    return responsePrint.data;
  } catch (error) {
    throw new Error(getAgentErrorMessage(error));
  }
};

/**
 * Busca a lista de impressoras disponíveis instaladas no PC do usuário (Agente Local).
 */
export const imprimirEtiquetasEmLote = async (etiquetas) => {
  const responseZpl = await api.post('/gerar_zpl_lote', { etiquetas });
  const zpl_payload = responseZpl.data.zpl_payload;
  const quantidade = responseZpl.data.quantidade;

  try {
    const responsePrint = await localApi.post(
      '/imprimir_raw',
      { zpl_payload, quantidade },
      { timeout: 60000 },
    );
    return responsePrint.data;
  } catch (error) {
    throw new Error(getAgentErrorMessage(error));
  }
};

export const listarImpressoras = async () => {
  try {
    const response = await localApi.get('/impressoras');
    return response.data;
  } catch (error) {
    console.error("Agente local não está rodando.", error);
    return ["ZDesigner S4M-203dpi ZPL"]; // Fallback
  }
};

export default api;

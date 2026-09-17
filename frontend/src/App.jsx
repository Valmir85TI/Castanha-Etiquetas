/**
 * App.jsx
 * 
 * Componente raiz da aplicação "Sistema de Impressão de Etiquetas".
 * Orquestra o fluxo completo: busca de produto, exibição de detalhes,
 * pré-visualização da etiqueta e envio para impressão.
 * 
 * Reproduz toda a lógica de negócio do main.py (Tkinter) original,
 * delegando a comunicação com os bancos de dados ao backend FastAPI.
 * 
 * @component
 */

import React, { useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';

/* Componentes */
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ProductDetails from './components/ProductDetails';
import LabelPreview from './components/LabelPreview';
import ActionButtons from './components/ActionButtons';
import ManagementLoginModal from './components/ManagementLoginModal';
import ManagementPage from './components/ManagementPage';

/* Serviço HTTP */
import {
  GERENCIA_ACCESS_KEY,
  GERENCIA_TOKEN_KEY,
  autenticarGerencia,
  buscarProduto,
  imprimirEtiqueta,
} from './services/api';

/* Estilos */
import './App.css';

/**
 * Estado inicial do formulário.
 * Reproduz os valores padrão do sistema original (Tkinter).
 */
const ESTADO_INICIAL = {
  codigo: '',
  quantidade: '1',
  tipoEtiqueta: 'Inteira',
};

const GERENCIA_ACCESS_DURATION_MS = 8 * 60 * 60 * 1000;

const AppFooter = () => (
  <footer className="app__footer">
    <p>© {new Date().getFullYear()} Castanha Supermercado — Sistema de Impressão de Etiquetas v2.0</p>
    <p>powered by Valmir Oliveira Ramos</p>
  </footer>
);

function App() {
  /* ---- Estado ---- */
  const [codigo, setCodigo] = useState(ESTADO_INICIAL.codigo);
  const [quantidade, setQuantidade] = useState(ESTADO_INICIAL.quantidade);
  const [tipoEtiqueta, setTipoEtiqueta] = useState(ESTADO_INICIAL.tipoEtiqueta);
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);
  const [gerenciaLoginOpen, setGerenciaLoginOpen] = useState(false);
  const [gerenciaLoading, setGerenciaLoading] = useState(false);

  /**
   * Realiza a busca de produto no backend via código de barras.
   * Aplica a mesma lógica de tratamento de códigos que comecem com "2"
   * presente no sistema original.
   */
  const handleBuscar = useCallback(async () => {
    const codigoLimpo = codigo.trim();
    if (!codigoLimpo) {
      toast.error('Informe um código de barras para buscar.');
      return;
    }

    setLoading(true);
    try {
      const dados = await buscarProduto(codigoLimpo);

      if (dados && dados.descricao) {
        setProduto(dados);
        setCodigo('');
        setQuantidade('1');
        toast.success(`Produto encontrado: ${dados.descricao}`, {
          icon: '📦',
          duration: 3000,
        });
      } else {
        toast.error('Produto não encontrado!', { icon: '⚠️' });
        handleLimpar();
      }
    } catch (error) {
      const mensagem = error.response?.data?.detail || 'Falha ao consultar o banco de dados.';
      toast.error(mensagem, { 
        icon: '❌', 
        duration: 5000,
        position: 'top-center'
      });
      // Limpa o código de barras e o produto se não encontrar
      setCodigo('');
      setProduto(null);
      console.error('[App] Erro na busca de produto:', error);
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  /**
   * Envia a solicitação de impressão ao backend.
   * Valida a quantidade e o produto carregado antes de prosseguir.
   */
  const handleImprimir = useCallback(async () => {
    if (!produto) {
      toast.error('Busque um produto antes de imprimir.', { position: 'top-center' });
      return;
    }

    if (!quantidade || parseInt(quantidade) < 1) {
      toast.error('Informe uma quantidade válida (1–9).', { position: 'top-center' });
      return;
    }

    setImprimindo(true);
    try {
      await imprimirEtiqueta({
        codigo_barras: produto.codigo_barras,
        cod_interno: produto.cod_interno,
        quantidade: parseInt(quantidade),
        tipo_etiqueta: tipoEtiqueta,
      });

      toast.success(
        `${quantidade} etiqueta(s) "${tipoEtiqueta}" enviada(s) para impressão!`,
        { icon: '🖨️', duration: 4000 }
      );

      handleLimpar();
    } catch (error) {
      const mensagem = error.response?.data?.detail || 'Falha de comunicação com a impressora.';
      toast.error(mensagem, { icon: '🚫', duration: 5000, position: 'top-center' });
      console.error('[App] Erro na impressão:', error);
    } finally {
      setImprimindo(false);
    }
  }, [produto, quantidade, tipoEtiqueta]);

  /**
   * Limpa todos os campos e retorna ao estado inicial.
   * Equivalente à função limpar_tela() do sistema original.
   */
  const handleLimpar = useCallback(() => {
    setCodigo(ESTADO_INICIAL.codigo);
    setQuantidade(ESTADO_INICIAL.quantidade);
    setTipoEtiqueta(ESTADO_INICIAL.tipoEtiqueta);
    setProduto(null);
  }, []);

  const handleAbrirGerencia = useCallback(() => {
    setGerenciaLoginOpen(true);
  }, []);

  const handleAutenticarGerencia = useCallback(async (credenciais) => {
    const gerenciaWindow = window.open('about:blank', '_blank');

    setGerenciaLoading(true);
    try {
      const auth = await autenticarGerencia(credenciais);
      const autorizadoAte = auth.expiresAt || Date.now() + GERENCIA_ACCESS_DURATION_MS;

      localStorage.setItem(GERENCIA_TOKEN_KEY, auth.token || '');
      localStorage.setItem(
        GERENCIA_ACCESS_KEY,
        String(autorizadoAte),
      );

      const gerenciaUrl = `${window.location.origin}/gerencia`;
      if (gerenciaWindow) {
        gerenciaWindow.location.href = gerenciaUrl;
      } else {
        window.open(gerenciaUrl, '_blank');
      }

      setGerenciaLoginOpen(false);
      toast.success('Acesso liberado.');
    } catch (error) {
      if (gerenciaWindow) {
        gerenciaWindow.close();
      }
      throw error;
    } finally {
      setGerenciaLoading(false);
    }
  }, []);

  const isGerenciaRoute = window.location.pathname.replace(/\/+$/, '') === '/gerencia';

  if (isGerenciaRoute) {
    return (
      <div className="app" id="app-root">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1f2e',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontFamily: "'Inter', sans-serif",
              marginTop: '50px',
              fontSize: '18px',
              padding: '16px 24px'
            },
          }}
        />
        <ManagementPage />
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="app" id="app-root">
      {/* Componente de notificações toast */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1f2e',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontFamily: "'Inter', sans-serif",
            marginTop: '50px',
            fontSize: '18px',
            padding: '16px 24px'
          },
        }}
      />

      {/* Cabeçalho */}
      <Header />

      {/* Conteúdo principal */}
      <main className="app__main">
        <div className="app__container">
          {/* Seção de busca */}
          <SearchBar
            codigo={codigo}
            onCodigoChange={setCodigo}
            quantidade={quantidade}
            onQuantidadeChange={setQuantidade}
            tipoEtiqueta={tipoEtiqueta}
            onTipoChange={setTipoEtiqueta}
            onBuscar={handleBuscar}
            loading={loading}
            hasProduto={!!produto}
          />

          {/* Layout em duas colunas: Detalhes + Preview */}
          <div className="app__content-grid">
            {/* Detalhes do produto */}
            <ProductDetails produto={produto} />

            {/* Pré-visualização da etiqueta */}
            <LabelPreview produto={produto} tipoEtiqueta={tipoEtiqueta} />
          </div>

          {/* Botões de ação */}
          <ActionButtons
            onImprimir={handleImprimir}
            onLimpar={handleLimpar}
            onGerencia={handleAbrirGerencia}
            produto={produto}
            loading={imprimindo}
          />
        </div>
      </main>

      {/* Rodapé */}
      <ManagementLoginModal
        open={gerenciaLoginOpen}
        loading={gerenciaLoading}
        onClose={() => setGerenciaLoginOpen(false)}
        onSubmit={handleAutenticarGerencia}
      />

      <AppFooter />
    </div>
  );
}

export default App;

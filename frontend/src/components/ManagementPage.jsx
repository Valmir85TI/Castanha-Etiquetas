import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiCalendar, FiDatabase, FiPrinter, FiRefreshCw, FiSearch, FiShield, FiX } from 'react-icons/fi';
import {
  GERENCIA_ACCESS_KEY,
  GERENCIA_TOKEN_KEY,
  buscarPrecosParaImpressaoEtiqueta,
  imprimirEtiquetasEmLote,
} from '../services/api';
import Header from './Header';
import './ManagementPage.css';

const COLUNAS_FIXAS = [
  { chave: 'produtoKey', titulo: 'Codigo Interno' },
  { chave: 'descricao', titulo: 'Descrição' },
  { chave: 'barra', titulo: 'Codigo de Barra' },
  { chave: 'departamentoNome', titulo: 'Departamento' },
  { chave: 'secaoNome', titulo: 'Seção' },
  { chave: 'grupoNome', titulo: 'Grupo' },
  { chave: 'subgrupoNome', titulo: 'Subgrupo' },
  { chave: 'precoNormal', titulo: 'Preço Normal' },
];

const getTodayInputValue = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const temAcessoGerencia = () => {
  const autorizadoAte = Number(localStorage.getItem(GERENCIA_ACCESS_KEY) || 0);
  return autorizadoAte > Date.now() && !!localStorage.getItem(GERENCIA_TOKEN_KEY);
};

const extrairItens = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const chaves = ['data', 'content', 'items', 'result', 'resultado'];
  for (const chave of chaves) {
    if (Array.isArray(payload[chave])) {
      return payload[chave];
    }
  }

  return [];
};

const formatarCampo = (chave, valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return '-';
  }

  if (typeof valor === 'number' && chave.toLowerCase().includes('preco')) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  if (typeof valor === 'object') {
    return JSON.stringify(valor);
  }

  return String(valor);
};

const normalizarTextoFiltro = (valor) => (
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

const getTextoFiltroItem = (item) => (
  COLUNAS_FIXAS
    .map((coluna) => formatarCampo(coluna.chave, item[coluna.chave]))
    .join(' ')
);

const formatarPrecoEtiqueta = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  if (typeof valor === 'number') {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return String(valor).replace(/^R\$\s*/, '').trim();
};

const getItemId = (item, index) => {
  const identificador = item.produtoKey || item.barra || item.gtin || item.codigoBarras;
  return `${identificador || 'linha'}-${index}`;
};

const getDadosImpressao = (item) => {
  const codigoBarras = item.barra || item.gtin || item.codigoBarras || item.codigo_barras || item.produtoKey;
  const codInterno = item.produtoKey || item.cod_interno || item.codigoInterno || item.codigo_interno || codigoBarras;
  const preco = formatarPrecoEtiqueta(
    item.precoNormal || item.precoVenda || item.preco || item.valor || item.precoPromocional,
  );
  const precoUnidade = formatarPrecoEtiqueta(
    item.precoUnidade || item.precoUnitario || item.precoPorUnidade || item.precoNormal,
  );

  return {
    codigo_barras: String(codigoBarras || ''),
    cod_interno: String(codInterno || ''),
    quantidade: 1,
    tipo_etiqueta: 'Inteira',
    descricao: item.descricao ? String(item.descricao) : undefined,
    preco: preco || undefined,
    preco_unidade: precoUnidade || undefined,
    unidade_medida: item.unidadeMedida || item.unidade_medida || item.tipoUnidadeMedida || undefined,
  };
};

const ManagementPage = () => {
  const [autorizado, setAutorizado] = useState(temAcessoGerencia);
  const [tipoConsultaProduto, setTipoConsultaProduto] = useState('PRECO_ATUAL');
  const [dataVigorar, setDataVigorar] = useState(getTodayInputValue);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imprimindoSelecionados, setImprimindoSelecionados] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [filtroResultado, setFiltroResultado] = useState('');

  const itens = useMemo(() => extrairItens(resultado), [resultado]);
  const termoFiltroResultado = useMemo(() => normalizarTextoFiltro(filtroResultado), [filtroResultado]);
  const itensFiltrados = useMemo(() => {
    const entradas = itens.map((item, index) => ({
      item,
      index,
      itemId: getItemId(item, index),
    }));

    if (!termoFiltroResultado) {
      return entradas;
    }

    return entradas.filter(({ item }) => (
      normalizarTextoFiltro(getTextoFiltroItem(item)).includes(termoFiltroResultado)
    ));
  }, [itens, termoFiltroResultado]);
  const itemIds = useMemo(() => itensFiltrados.map(({ itemId }) => itemId), [itensFiltrados]);
  const itensSelecionados = useMemo(
    () => itensFiltrados
      .filter(({ itemId }) => selectedItemIds.has(itemId))
      .map(({ item }) => item),
    [itensFiltrados, selectedItemIds],
  );
  const todosSelecionados = itemIds.length > 0 && itensSelecionados.length === itemIds.length;

  const colunas = useMemo(() => {
    if (itens.length === 0) return [];
    return COLUNAS_FIXAS;
  }, [itens]);

  const handleConsultar = async (event) => {
    event.preventDefault();

    if (tipoConsultaProduto === 'PRECO_A_VIGORAR' && !dataVigorar) {
      toast.error('Informe a data para consultar preco a vigorar.');
      return;
    }

    setLoading(true);
    try {
      const dados = await buscarPrecosParaImpressaoEtiqueta({
        tipoConsultaProduto,
        dataVigorar: tipoConsultaProduto === 'PRECO_A_VIGORAR' ? dataVigorar : undefined,
      });
      setResultado(dados);
      setSelectedItemIds(new Set());
      toast.success(`${extrairItens(dados).length} item(ns) carregado(s).`);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem(GERENCIA_ACCESS_KEY);
        localStorage.removeItem(GERENCIA_TOKEN_KEY);
        setAutorizado(false);
      }
      const mensagem = error.response?.data?.detail || 'Falha ao consultar a API da Bluesoft.';
      toast.error(typeof mensagem === 'string' ? mensagem : 'Falha ao consultar a API da Bluesoft.');
      console.error('[Gerencia] Erro ao consultar precos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarTodos = () => {
    setSelectedItemIds(todosSelecionados ? new Set() : new Set(itemIds));
  };

  const handleSelecionarItem = (itemId) => {
    setSelectedItemIds((idsAtuais) => {
      const proximosIds = new Set(idsAtuais);

      if (proximosIds.has(itemId)) {
        proximosIds.delete(itemId);
      } else {
        proximosIds.add(itemId);
      }

      return proximosIds;
    });
  };

  const handleImprimirSelecionados = async () => {
    if (itensSelecionados.length === 0) {
      toast.error('Selecione pelo menos uma linha para imprimir.');
      return;
    }

    setImprimindoSelecionados(true);
    try {
      const etiquetas = itensSelecionados.map(getDadosImpressao);

      if (etiquetas.some((etiqueta) => !etiqueta.codigo_barras && !etiqueta.cod_interno)) {
        throw new Error('Uma das linhas selecionadas nao possui codigo para impressao.');
      }

      toast.loading(`Enviando ${etiquetas.length} etiqueta(s) em lote...`, {
        id: 'gerencia-impressao',
      });

      await imprimirEtiquetasEmLote(etiquetas);

      toast.success(`${itensSelecionados.length} etiqueta(s) enviada(s) para impressao.`, {
        id: 'gerencia-impressao',
      });
      setSelectedItemIds(new Set());
    } catch (error) {
      const mensagem = error.response?.data?.detail || error.message || 'Falha ao imprimir etiquetas selecionadas.';
      toast.error(mensagem, { id: 'gerencia-impressao', duration: 5000 });
      console.error('[Gerencia] Erro ao imprimir selecionados:', error);
    } finally {
      setImprimindoSelecionados(false);
    }
  };

  if (!autorizado) {
    return (
      <>
        <Header />
        <main className="management-page management-page--center">
          <section className="management-page__denied">
            <FiShield className="management-page__denied-icon" />
            <h1>Acesso restrito</h1>
            <p>Use o botao Gerencia na tela principal para entrar.</p>
            <button type="button" onClick={() => { window.location.href = '/'; }}>
              <FiArrowLeft />
              Voltar
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="management-page">
        <section className="management-page__panel animate-slide-up">
          <div className="management-page__header">
            <div className="management-page__title">
              <FiDatabase className="management-page__title-icon" />
              <div>
                <h1>Gerencia</h1>
                <p>Precos para impressao de etiqueta</p>
              </div>
            </div>
            <span className="management-page__badge">Loja 1</span>
          </div>

          <form className="management-page__filters" onSubmit={handleConsultar}>
            <label className="management-page__field">
              <span>Tipo de consulta</span>
              <select
                value={tipoConsultaProduto}
                onChange={(event) => setTipoConsultaProduto(event.target.value)}
              >
                <option value="PRECO_ATUAL">PRECO_ATUAL</option>
                <option value="PRECO_A_VIGORAR">PRECO_A_VIGORAR</option>
              </select>
            </label>

            <label className="management-page__field">
              <span>
                <FiCalendar />
                Data Vigorar
              </span>
              <input
                type="date"
                value={dataVigorar}
                onChange={(event) => setDataVigorar(event.target.value)}
                required={tipoConsultaProduto === 'PRECO_A_VIGORAR'}
              />
            </label>

            <button className="management-page__submit" type="submit" disabled={loading}>
              <FiRefreshCw className={loading ? 'management-page__spin' : undefined} />
              <span>{loading ? 'Consultando...' : 'Consultar'}</span>
            </button>
          </form>
        </section>

        <section className="management-page__results animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="management-page__results-header">
            <h2>Resultado</h2>
            <div className="management-page__results-actions">
              <label className="management-page__filter-field">
                <span>
                  <FiSearch />
                  Filtrar
                </span>
                <div className="management-page__filter-input-wrap">
                  <FiSearch className="management-page__filter-icon" />
                  <input
                    type="search"
                    value={filtroResultado}
                    onChange={(event) => setFiltroResultado(event.target.value)}
                    placeholder="Digite para filtrar..."
                    aria-label="Filtrar resultados"
                  />
                  {filtroResultado && (
                    <button
                      className="management-page__clear-filter"
                      type="button"
                      onClick={() => setFiltroResultado('')}
                      aria-label="Limpar filtro"
                    >
                      <FiX />
                    </button>
                  )}
                </div>
              </label>
              <button
                className="management-page__print-selected"
                type="button"
                disabled={itensSelecionados.length === 0 || imprimindoSelecionados}
                onClick={handleImprimirSelecionados}
              >
                <FiPrinter />
                <span>{imprimindoSelecionados ? 'Imprimindo...' : 'Imprimir selecionadas'}</span>
              </button>
              <div className="management-page__meta">
                <span>pageSize 500</span>
                <span>{termoFiltroResultado ? `${itensFiltrados.length} de ${itens.length}` : itens.length} item(ns)</span>
                <span>{itensSelecionados.length} selecionado(s)</span>
              </div>
            </div>
          </div>

          {itens.length > 0 && colunas.length > 0 && itensFiltrados.length > 0 ? (
            <div className="management-page__table-wrap">
              <table className="management-page__table">
                <thead>
                  <tr>
                    <th className="management-page__select-cell">
                      <input
                        className="management-page__checkbox"
                        type="checkbox"
                        checked={todosSelecionados}
                        onChange={handleSelecionarTodos}
                        aria-label="Selecionar todas as linhas"
                      />
                    </th>
                    {colunas.map((coluna) => (
                      <th key={coluna.chave}>{coluna.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itensFiltrados.map(({ item, itemId }) => {
                    const selecionado = selectedItemIds.has(itemId);

                    return (
                      <tr
                        key={itemId}
                        className={selecionado ? 'management-page__row--selected' : undefined}
                      >
                        <td className="management-page__select-cell">
                          <input
                            className="management-page__checkbox"
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => handleSelecionarItem(itemId)}
                            aria-label={`Selecionar ${formatarCampo('descricao', item.descricao)}`}
                          />
                        </td>
                        {colunas.map((coluna) => (
                          <td key={coluna.chave}>{formatarCampo(coluna.chave, item[coluna.chave])}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="management-page__empty">
              <FiDatabase />
              <p>
                {resultado
                  ? (termoFiltroResultado ? 'Nenhum item encontrado para o filtro.' : 'Nenhum item encontrado.')
                  : 'Aguardando consulta.'}
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default ManagementPage;

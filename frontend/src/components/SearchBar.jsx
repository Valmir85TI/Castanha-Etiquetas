/**
 * SearchBar.jsx
 * 
 * Componente de busca de produtos por código de barras.
 * Inclui campo de entrada com ícone de scanner, campo de quantidade
 * e seletor de tipo de etiqueta. Dispara a busca via Enter ou botão.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.codigo - Valor atual do campo de código de barras.
 * @param {Function} props.onCodigoChange - Callback ao alterar o código.
 * @param {string} props.quantidade - Valor atual do campo de quantidade.
 * @param {Function} props.onQuantidadeChange - Callback ao alterar a quantidade.
 * @param {string} props.tipoEtiqueta - Tipo de etiqueta selecionado.
 * @param {Function} props.onTipoChange - Callback ao alterar o tipo.
 * @param {Function} props.onBuscar - Callback ao submeter a busca.
 * @param {boolean} props.loading - Indica se a busca está em andamento.
 */

import React, { useRef, useEffect } from 'react';
import { FiSearch, FiHash, FiLayers } from 'react-icons/fi';
import { HiOutlineQrCode } from 'react-icons/hi2';
import './SearchBar.css';

/** Lista de tipos de etiqueta disponíveis no sistema */
const TIPOS_ETIQUETA = ['Inteira', 'Meia', 'Carreiras', 'Editavel'];

const SearchBar = ({
  codigo,
  onCodigoChange,
  quantidade,
  onQuantidadeChange,
  tipoEtiqueta,
  onTipoChange,
  onBuscar,
  loading,
  hasProduto,
}) => {
  /** Referência ao input de código para auto-focus */
  const inputCodigoRef = useRef(null);

  /**
   * Foca automaticamente no campo de código ao montar o componente,
   * simulando o comportamento do sistema Tkinter original.
   * Também refoca o campo sempre que a busca (loading) termina, caso nenhum produto tenha sido encontrado.
   */
  useEffect(() => {
    if (!loading && !hasProduto && inputCodigoRef.current) {
      // Pequeno timeout para garantir que o DOM atualizou o estado "disabled" do input
      setTimeout(() => {
        inputCodigoRef.current?.focus();
      }, 50);
    }
  }, [loading, hasProduto]);

  /**
   * Intercepta a tecla Enter para disparar a busca
   * e a tecla Escape para limpar o campo.
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onBuscar();
    }
    if (e.key === 'Escape') {
      onCodigoChange('');
      inputCodigoRef.current?.focus();
    }
  };

  /**
   * Valida e limita a quantidade a um dígito numérico (1-9).
   * Reproduz a regra do sistema original.
   */
  const handleQuantidadeChange = (e) => {
    const value = e.target.value;
    if (value === '' || (/^\d$/.test(value) && parseInt(value) >= 1)) {
      onQuantidadeChange(value);
    }
  };

  return (
    <div className="search-bar animate-slide-up" id="search-bar-section">
      <div className="search-bar__header">
        <HiOutlineQrCode className="search-bar__header-icon" />
        <h2 className="search-bar__header-title">Buscar Produto</h2>
      </div>

      <div className="search-bar__fields">
        {/* Campo Código de Barras */}
        <div className="search-bar__field search-bar__field--codigo">
          <label className="search-bar__label" htmlFor="input-codigo">
            <FiSearch className="search-bar__label-icon" />
            Ler Código de Barra
          </label>
          <div className="search-bar__input-wrapper">
            <input
              ref={inputCodigoRef}
              type="text"
              id="input-codigo"
              className="search-bar__input"
              placeholder="Escaneie ou digite o código..."
              value={codigo}
              onChange={(e) => onCodigoChange(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={14}
              autoComplete="off"
              disabled={loading}
            />
            {loading && <div className="search-bar__spinner"></div>}
          </div>
        </div>

        {/* Campo Quantidade */}
        <div className="search-bar__field search-bar__field--quantidade">
          <label className="search-bar__label" htmlFor="input-quantidade">
            <FiHash className="search-bar__label-icon" />
            Quantidade
          </label>
          <input
            type="text"
            id="input-quantidade"
            className="search-bar__input search-bar__input--small"
            value={quantidade}
            onChange={handleQuantidadeChange}
            maxLength={1}
            autoComplete="off"
          />
        </div>

        {/* Seletor Tipo de Etiqueta */}
        <div className="search-bar__field search-bar__field--tipo">
          <label className="search-bar__label" htmlFor="select-tipo-etiqueta">
            <FiLayers className="search-bar__label-icon" />
            Tipo de Etiqueta
          </label>
          <select
            id="select-tipo-etiqueta"
            className="search-bar__select"
            value={tipoEtiqueta}
            onChange={(e) => onTipoChange(e.target.value)}
          >
            {TIPOS_ETIQUETA.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>

        {/* Botão de Busca */}
        <div className="search-bar__field search-bar__field--action">
          <button
            id="btn-buscar"
            className="search-bar__btn-search"
            onClick={onBuscar}
            disabled={loading || !codigo.trim()}
          >
            <FiSearch />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;

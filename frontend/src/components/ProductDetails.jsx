/**
 * ProductDetails.jsx
 * 
 * Componente de exibição dos detalhes do produto encontrado.
 * Mostra os campos: Descrição, Preço, Código de Barra,
 * Código Interno, Unidade de Medida e Preço por Unidade.
 * 
 * Inclui animação de entrada quando um produto é carregado
 * e estado vazio quando nenhum produto foi buscado.
 * 
 * @component
 * @param {Object} props
 * @param {Object|null} props.produto - Dados do produto, ou null se vazio.
 */

import React from 'react';
import { FiPackage, FiDollarSign, FiBarChart2, FiTag, FiBox, FiPercent } from 'react-icons/fi';
import './ProductDetails.css';

/**
 * Configuração dos campos de exibição do produto.
 * Cada item define o ícone, label e a chave no objeto de produto.
 */
const CAMPOS_PRODUTO = [
  { key: 'descricao', label: 'Descrição do Produto', icon: FiPackage, destaque: true },
  { key: 'preco', label: 'Preço (R$)', icon: FiDollarSign, formato: 'preco' },
  { key: 'codigo_barras', label: 'Código de Barra', icon: FiBarChart2 },
  { key: 'cod_interno', label: 'Código Interno', icon: FiTag },
  { key: 'unidade_medida', label: 'Unidade de Medida', icon: FiBox },
  { key: 'preco_unidade', label: 'Preço por Unidade', icon: FiPercent, formato: 'preco' },
];

const ProductDetails = ({ produto }) => {
  return (
    <div className="product-details animate-slide-up" id="product-details-section" style={{ animationDelay: '0.1s' }}>
      <div className="product-details__header">
        <FiPackage className="product-details__header-icon" />
        <h2 className="product-details__header-title">Dados do Produto</h2>
      </div>

      {/* Estado vazio: nenhum produto buscado */}
      {!produto ? (
        <div className="product-details__empty">
          <div className="product-details__empty-icon">
            <FiBarChart2 />
          </div>
          <p className="product-details__empty-text">
            Escaneie ou digite um código de barras para visualizar os dados do produto.
          </p>
        </div>
      ) : (
        /* Grade de campos do produto encontrado */
        <div className="product-details__grid">
          {CAMPOS_PRODUTO.map(({ key, label, icon: Icon, destaque, formato }) => (
            <div
              key={key}
              className={`product-details__field ${destaque ? 'product-details__field--destaque' : ''}`}
            >
              <div className="product-details__field-label">
                <Icon className="product-details__field-icon" />
                {label}
              </div>
              <div className={`product-details__field-value ${formato === 'preco' ? 'product-details__field-value--preco' : ''}`}>
                {formato === 'preco' && produto[key] ? (
                  <>
                    <span className="product-details__currency">R$</span>
                    {produto[key]}
                  </>
                ) : (
                  produto[key] || '—'
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductDetails;

/**
 * LabelPreview.jsx
 * 
 * Componente de pré-visualização da etiqueta que será impressa.
 * Renderiza uma simulação visual do layout ZPL com base nos dados
 * do produto e no tipo de etiqueta selecionado.
 * 
 * @component
 * @param {Object} props
 * @param {Object|null} props.produto - Dados do produto carregado.
 * @param {string} props.tipoEtiqueta - Tipo de etiqueta (Inteira, Meia, Carreiras, Editavel).
 */

import React from 'react';
import { FiEye, FiPrinter } from 'react-icons/fi';
import './LabelPreview.css';

const LabelPreview = ({ produto, tipoEtiqueta }) => {
  /**
   * Obtém a data atual formatada no padrão brasileiro (dd/mm/yyyy).
   * @returns {string} Data formatada.
   */
  const getDataAtual = () => {
    const now = new Date();
    return now.toLocaleDateString('pt-BR');
  };

  /**
   * Renderiza o conteúdo visual da etiqueta "Inteira".
   * Simula visualmente o template ZPL com logo, código de barras e preço.
   */
  const renderInteira = () => (
    <div className="label-preview__label label-preview__label--inteira">
      <div className="label-preview__label-header">
        <span className="label-preview__label-brand">CASTANHA</span>
      </div>
      <p className="label-preview__label-desc">{produto?.descricao || 'DESCRIÇÃO DO PRODUTO'}</p>
      <div className="label-preview__label-barcode">
        <div className="label-preview__barcode-lines">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="label-preview__barcode-line" style={{ width: `${Math.random() * 2 + 1}px` }}></div>
          ))}
        </div>
        <span className="label-preview__barcode-number">{produto?.codigo_barras || '0000000000000'}</span>
      </div>
      <div className="label-preview__label-footer">
        <span className="label-preview__label-date">{getDataAtual()}</span>
        <div className="label-preview__label-price-group">
          <span className="label-preview__label-price-symbol">R$</span>
          <span className="label-preview__label-price">{produto?.preco || '0,00'}</span>
        </div>
      </div>
      <div className="label-preview__label-unit">
        Valor de: 1 {produto?.unidade_medida || 'UN'} — R$ {produto?.preco_unidade || '0,00'}
      </div>
    </div>
  );

  /**
   * Renderiza o conteúdo visual da etiqueta "Meia" (duas etiquetas lado a lado).
   */
  const renderMeia = () => (
    <div className="label-preview__label label-preview__label--meia">
      {[0, 1].map((idx) => (
        <div key={idx} className="label-preview__half">
          <p className="label-preview__half-desc">{produto?.descricao || 'DESCRIÇÃO'}</p>
          <div className="label-preview__half-barcode">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="label-preview__barcode-line label-preview__barcode-line--small"></div>
            ))}
          </div>
          <div className="label-preview__half-price">
            <span>R$</span>
            <strong>{produto?.preco || '0,00'}</strong>
          </div>
        </div>
      ))}
    </div>
  );

  /**
   * Renderiza o conteúdo visual da etiqueta "Carreiras" (3 etiquetas em linha).
   */
  const renderCarreiras = () => (
    <div className="label-preview__label label-preview__label--carreiras">
      {[0, 1, 2].map((idx) => (
        <div key={idx} className="label-preview__carreira">
          <p className="label-preview__carreira-desc">
            {produto?.descricao ? produto.descricao.substring(0, 25) : 'DESCRIÇÃO'}
          </p>
          <div className="label-preview__carreira-price">
            R$ <strong>{produto?.preco || '0,00'}</strong>
          </div>
          <span className="label-preview__carreira-cod">{produto?.cod_interno || '0000'}</span>
        </div>
      ))}
    </div>
  );

  /**
   * Renderiza o conteúdo visual da etiqueta "Editavel".
   */
  const renderEditavel = () => (
    <div className="label-preview__label label-preview__label--editavel">
      <div className="label-preview__editavel-content">
        <FiPrinter className="label-preview__editavel-icon" />
        <p>Etiqueta Editável</p>
        <span>Formato customizado carregado do template</span>
      </div>
    </div>
  );

  /**
   * Seleciona o renderizador correto com base no tipo de etiqueta.
   */
  const renderLabel = () => {
    switch (tipoEtiqueta) {
      case 'Inteira': return renderInteira();
      case 'Meia': return renderMeia();
      case 'Carreiras': return renderCarreiras();
      case 'Editavel': return renderEditavel();
      default: return renderInteira();
    }
  };

  return (
    <div className="label-preview animate-slide-up" id="label-preview-section" style={{ animationDelay: '0.2s' }}>
      <div className="label-preview__header">
        <FiEye className="label-preview__header-icon" />
        <h2 className="label-preview__header-title">Pré-visualização</h2>
        <span className="label-preview__badge">{tipoEtiqueta}</span>
      </div>

      <div className="label-preview__canvas">
        {renderLabel()}
      </div>

      <div className="label-preview__info">
        <span>Impressora: <strong>ZDesigner S4M-203dpi ZPL</strong></span>
      </div>
    </div>
  );
};

export default LabelPreview;

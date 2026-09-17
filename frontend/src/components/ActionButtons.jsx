/**
 * ActionButtons.jsx
 * 
 * Componente de botões de ação da aplicação.
 * Contém os botões "Imprimir Etiqueta" e "Limpar Campos",
 * reproduzindo as ações do sistema Tkinter original.
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.onImprimir - Callback ao clicar em Imprimir.
 * @param {Function} props.onLimpar - Callback ao clicar em Limpar.
 * @param {boolean} props.produto - Indica se há produto carregado (habilita/desabilita botões).
 * @param {boolean} props.loading - Indica se uma operação está em andamento.
 */

import React, { useRef, useEffect } from 'react';
import { FiPrinter, FiSettings, FiTrash2 } from 'react-icons/fi';
import './ActionButtons.css';

const ActionButtons = ({ onImprimir, onLimpar, onGerencia, produto, loading }) => {
  const btnImprimirRef = useRef(null);

  useEffect(() => {
    if (produto && btnImprimirRef.current) {
      setTimeout(() => {
        btnImprimirRef.current.focus();
      }, 50);
    }
  }, [produto]);

  return (
    <div className="action-buttons animate-slide-up" id="action-buttons-section" style={{ animationDelay: '0.3s' }}>
      {/* Botão principal: Imprimir Etiqueta */}
      <button
        ref={btnImprimirRef}
        id="btn-imprimir"
        className="action-buttons__btn action-buttons__btn--primary"
        onClick={onImprimir}
        disabled={!produto || loading}
      >
        <FiPrinter className="action-buttons__btn-icon" />
        <span>{loading ? 'Imprimindo...' : 'Imprimir Etiqueta'}</span>
      </button>

      {/* Botão secundário: Limpar Campos */}
      <button
        id="btn-limpar"
        className="action-buttons__btn action-buttons__btn--secondary"
        onClick={onLimpar}
      >
        <FiTrash2 className="action-buttons__btn-icon" />
        <span>Limpar Campos</span>
      </button>

      <button
        id="btn-gerencia"
        className="action-buttons__btn action-buttons__btn--manager"
        onClick={onGerencia}
      >
        <FiSettings className="action-buttons__btn-icon" />
        <span>Gerencial</span>
      </button>
    </div>
  );
};

export default ActionButtons;

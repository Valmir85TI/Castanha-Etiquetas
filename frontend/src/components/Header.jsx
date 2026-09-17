/**
 * Header.jsx
 * 
 * Componente de cabeçalho principal da aplicação.
 * Exibe o logotipo "Castanha Supermercado" e o título do sistema.
 * Inclui efeito glassmorphism e gradiente de borda inferior.
 * 
 * @component
 */

import React from 'react';
import { FiPrinter } from 'react-icons/fi';
import logo from '../assets/logo.png';
import './Header.css';

const Header = () => {
  return (
    <header className="header" id="header-principal">
      <div className="header__container">
        {/* Logotipo Castanha Supermercado */}
        <div className="header__brand">
          <img
            src={logo}
            alt="Castanha Supermercado"
            className="header__logo"
          />
        </div>

        {/* Título do sistema com ícone */}
        <div className="header__title-group">
          <div className="header__icon-wrapper">
            <FiPrinter className="header__icon" />
          </div>
          <div>
            <h1 className="header__title">Impressão de Etiquetas</h1>
            <p className="header__subtitle">Sistema de Gerenciamento de Etiquetas</p>
          </div>
        </div>

        {/* Indicador de status */}
        <div className="header__status">
          <span className="header__status-dot"></span>
          <span className="header__status-text">Sistema Online</span>
        </div>
      </div>
    </header>
  );
};

export default Header;

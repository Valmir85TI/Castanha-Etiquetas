/**
 * main.jsx
 * 
 * Ponto de entrada da aplicação React.
 * Importa o design system global (index.css) e renderiza o componente App.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import React, { useEffect, useState } from 'react';
import { FiLock, FiLogIn, FiUser, FiX } from 'react-icons/fi';
import './ManagementLoginModal.css';

const ESTADO_INICIAL = {
  usuario: '',
  senha: '',
};

const ManagementLoginModal = ({ open, loading, onClose, onSubmit }) => {
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (open) {
      setForm(ESTADO_INICIAL);
      setErro('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro('');

    try {
      await onSubmit({
        usuario: form.usuario.trim(),
        senha: form.senha,
      });
    } catch (error) {
      const mensagem = error.response?.data?.detail || 'Usuario ou senha invalidos.';
      setErro(mensagem);
    }
  };

  return (
    <div className="management-login" role="dialog" aria-modal="true" aria-labelledby="management-login-title">
      <div className="management-login__backdrop" onClick={loading ? undefined : onClose} />

      <form className="management-login__panel animate-scale-in" onSubmit={handleSubmit}>
        <button
          type="button"
          className="management-login__close"
          onClick={onClose}
          disabled={loading}
          aria-label="Fechar"
        >
          <FiX />
        </button>

        <div className="management-login__header">
          <div className="management-login__icon">
            <FiLock />
          </div>
          <div>
            <h2 id="management-login-title">Gerencia</h2>
            <p>Acesso administrativo</p>
          </div>
        </div>

        <label className="management-login__field">
          <span>
            <FiUser />
            Usuario
          </span>
          <input
            name="usuario"
            value={form.usuario}
            onChange={handleChange}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label className="management-login__field">
          <span>
            <FiLock />
            Senha
          </span>
          <input
            name="senha"
            type="password"
            value={form.senha}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </label>

        {erro && <div className="management-login__error">{erro}</div>}

        <button className="management-login__submit" type="submit" disabled={loading}>
          <FiLogIn />
          <span>{loading ? 'Validando...' : 'Entrar'}</span>
        </button>
      </form>
    </div>
  );
};

export default ManagementLoginModal;

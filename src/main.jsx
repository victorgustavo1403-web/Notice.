import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext.jsx';
import { PublicacaoFormProvider } from './PublicacaoFormContext.jsx';
import { AvisosProvider } from './ui/Avisos.jsx';
import Perfil from './Perfil.jsx';
import { TemaProvider, BotaoTema } from './ui/Tema.jsx';
import { ativarValidacaoPt } from './validacaoPt.js';
import './styles/tokens.css';
import './styles/tema-escuro.css';
import './styles/tema-escuro-ajustes.css';

import RotaProtegida from './RotaProtegida.jsx';
import App from './Hero.jsx';
import Auth from './Auth.jsx';
import Home from './Home-usuario.jsx';
import HomeAdmin from './Home-admin.jsx';
import CadastroUsuario from './cadastro-usuario.jsx';
import HomeComum from './HomeComum.jsx';
import Categoria from './Categoria.jsx';
import RelatorioAcessos from './RelatorioAcessos.jsx';
import TV from './TV.jsx';
import Curriculos from './Curriculos.jsx';

import './styles/padroes.css'; // botões, hovers e cards padronizados
import './styles/mobile.css'; // por último: o layout de celular tem de vencer os CSS das páginas

ativarValidacaoPt();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TemaProvider>
    <AuthProvider>
      <AvisosProvider>
      <PublicacaoFormProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<App />} />

          <Route path="/login" element={<Auth />} />

          {/* MURAL DA TV: público, sem login (a TV do corredor fica ligada o dia todo) */}
          <Route path="/tv" element={<TV />} />

          {/* HOME DE CADA PERFIL (um único login; RotaProtegida devolve cada um para a sua) */}
          <Route
            path="/home"
            element={
              <RotaProtegida tiposPermitidos={['super_admin']}>
                <Home />
              </RotaProtegida>
            }
          />

          <Route
            path="/home-admin"
            element={
              <RotaProtegida tiposPermitidos={['administrador']}>
                <HomeAdmin />
              </RotaProtegida>
            }
          />

          {/* PERFIL: qualquer usuário logado */}
          <Route
            path="/perfil"
            element={
              <RotaProtegida>
                <Perfil />
              </RotaProtegida>
            }
          />

          {/* SOMENTE SUPER ADMIN */}
          <Route
            path="/cadastro-usuario"
            element={
              <RotaProtegida tiposPermitidos={['super_admin']}>
                <CadastroUsuario />
              </RotaProtegida>
            }
          />

          <Route
            path="/relatorio-acessos"
            element={
              <RotaProtegida tiposPermitidos={['super_admin']}>
                <RelatorioAcessos />
              </RotaProtegida>
            }
          />

          {/* CURRÍCULOS ENVIADOS NAS VAGAS: administradores e super admin */}
          <Route
            path="/curriculos"
            element={
              <RotaProtegida tiposPermitidos={['administrador', 'super_admin']}>
                <Curriculos />
              </RotaProtegida>
            }
          />

          {/* TODOS OS USUÁRIOS LOGADOS */}
          <Route
            path="/categoria/:slug"
            element={
              <RotaProtegida>
                <Categoria />
              </RotaProtegida>
            }
          />

          <Route
            path="/home-comum"
            element={
              <RotaProtegida>
                <HomeComum />
              </RotaProtegida>
            }
          />

        </Routes>
      </BrowserRouter>
      </PublicacaoFormProvider>
        <BotaoTema />
      </AvisosProvider>
    </AuthProvider>
    </TemaProvider>
  </StrictMode>
);
// PWA: registra o service worker só no site publicado (build de produção)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((erro) => console.warn('Service worker não registrado:', erro));
  });
}

// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Tabs from "./components/Tabs";

import Login from "./pages/Login";
import CompletarCadastro from "./pages/CompletarCadastro";
import DetalheMilitar from "./pages/DetalheMilitar";
import AdminFerramentas from "./pages/AdminFerramentas"; // <- Ferramentas (importador)

import { auth, db } from "./services/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function Spinner() {
  return (
    <div className="d-flex vh-100 justify-content-center align-items-center">
      <div className="spinner-border text-danger" role="status" />
    </div>
  );
}

/** Guarda de rota:
 * - sem auth -> /login
 * - sem perfil (ou campos essenciais vazios) -> /completar-cadastro
 * - ok -> segue
 */
function RequireSetup({ children }) {
  const [status, setStatus] = useState("loading"); // loading | noauth | needsProfile | ok

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return setStatus("noauth");
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (!snap.exists()) return setStatus("needsProfile");
        const d = snap.data() || {};
        const missing = !d.nome || !d.posto || !d.funcao;
        setStatus(missing ? "needsProfile" : "ok");
      } catch (e) {
        console.warn("Erro ao verificar perfil:", e);
        setStatus("ok");
      }
    });
    return () => unsub();
  }, []);

  if (status === "loading") return <Spinner />;
  if (status === "noauth") return <Navigate to="/login" replace />;
  if (status === "needsProfile") return <Navigate to="/completar-cadastro" replace />;
  return children;
}

/** Guarda de acesso: exige usuarios/{uid}.acesso === "total" */
function RequireStaff({ children }) {
  const [state, setState] = useState("loading"); // loading | allow | deny

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return setState("deny");
      try {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        const d = snap.exists() ? snap.data() : null;
        if (d && d.acesso === "total") setState("allow");
        else setState("deny");
      } catch (e) {
        console.warn("Falha ao checar acesso:", e);
        setState("deny");
      }
    });
    return () => unsub();
  }, []);

  if (state === "loading") return <Spinner />;
  if (state === "deny") return <Navigate to="/sem-acesso" replace />;
  return children;
}

function LoginWrapper() {
  // Evita exibir tela de login se já estiver autenticado
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/painel", { replace: true });
      else setChecking(false);
    });
    return () => unsub();
  }, [navigate]);
  if (checking) return <Spinner />;
  return <Login />;
}

function MainPanel() {
  const [selectedModule, setSelectedModule] = useState("B1");
  return (
    <div className="d-flex flex-column vh-100">
      <Header />
      <div className="d-flex flex-grow-1">
        <Sidebar onSelectModule={setSelectedModule} />
        <main className="flex-grow-1 p-4 bg-light overflow-auto">
          <Tabs module={selectedModule} />
        </main>
      </div>
    </div>
  );
}

function SemAcesso() {
  return (
    <div className="d-flex vh-100 justify-content-center align-items-center">
      <div className="text-center">
        <h4 className="mb-2">Acesso negado</h4>
        <p className="text-muted mb-3">
          Seu usuário não possui acesso a este sistema.
        </p>
        <a className="btn btn-outline-primary" href="/login">Voltar ao login</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginWrapper />} />
        <Route path="/completar-cadastro" element={<CompletarCadastro />} />

        {/* Rotas protegidas por perfil + acesso total */}
        <Route
          path="/painel"
          element={
            <RequireSetup>
              <RequireStaff>
                <MainPanel />
              </RequireStaff>
            </RequireSetup>
          }
        />
        <Route
          path="/militar/:id"
          element={
            <RequireSetup>
              <RequireStaff>
                <DetalheMilitar />
              </RequireStaff>
            </RequireSetup>
          }
        />
        <Route
          path="/admin/ferramentas"
          element={
            <RequireSetup>
              <RequireStaff>
                <AdminFerramentas />
              </RequireStaff>
            </RequireSetup>
          }
        />

        {/* Página de acesso negado */}
        <Route path="/sem-acesso" element={<SemAcesso />} />

        {/* Defaults */}
        <Route path="/" element={<Navigate to="/painel" replace />} />
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

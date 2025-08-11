import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Painel from "./pages/Painel";
import CompletarCadastro from "./pages/CompletarCadastro"; // 🔹 Novo import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/completar-cadastro" element={<CompletarCadastro />} /> {/* 🔹 Nova rota */}
      </Routes>
    </Router>
  );
}

export default App;

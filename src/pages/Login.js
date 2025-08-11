import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      window.location.href = "/painel";
    } catch (err) {
      setErro("Email ou senha inválidos.");
    }
  };

  return (
    <div
      className="container mt-5 p-4 shadow rounded"
      style={{ maxWidth: "400px", backgroundColor: "#ffffff" }}
    >
      <div className="text-center mb-4">
        <img
          src="/image-33.png.webp"
          alt="Logo 20º GBM"
          style={{
            maxWidth: "120px",
            height: "auto",
            marginBottom: "10px",
          }}
        />
        <h4 className="fw-bold text-primary">Login - 20º GBM</h4>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}

      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu email"
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Senha</label>
          <input
            type="password"
            className="form-control"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite sua senha"
            required
          />
        </div>
        <button className="btn btn-primary w-100" type="submit">
          Entrar
        </button>
      </form>
    </div>
  );
}

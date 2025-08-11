// src/pages/CompletarCadastro.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../services/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile, onAuthStateChanged } from "firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";

export default function CompletarCadastro() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [nomeDeGuerra, setNomeDeGuerra] = useState("");
  const [posto, setPosto] = useState("");
  const [funcao, setFuncao] = useState("");
  const [setor, setSetor] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      // preenche email e nome a partir do auth quando disponível
      setEmail(user.email || "");
      if (user.displayName) setNome(user.displayName);
      if (user.photoURL) setPreview(user.photoURL);
    });

    return () => unsub();
  }, [navigate]);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (f) {
      setFoto(f);
      setPreview(URL.createObjectURL(f));
    } else {
      setFoto(null);
      setPreview(null);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");

      // upload da foto (se houver)
      let fotoURL = user.photoURL || "";
      if (foto) {
        const ext = foto.name.split(".").pop();
        const fileRef = ref(storage, `usuarios/${user.uid}/perfil_${Date.now()}.${ext}`);
        await uploadBytes(fileRef, foto);
        fotoURL = await getDownloadURL(fileRef);
      }

      // gravar/atualizar documento no Firestore (merge: true para não sobrescrever acidentalmente)
      const userDocRef = doc(db, "usuarios", user.uid);
      await setDoc(
        userDocRef,
        {
          nome,
          nomeDeGuerra,
          posto,
          funcao,
          setor,
          telefone,
          email,
          fotoURL,
          criadoEm: serverTimestamp()
        },
        { merge: true }
      );

      // atualizar profile do Firebase Auth (opcional, mas útil)
      try {
        await updateProfile(user, {
          displayName: nome,
          photoURL: fotoURL || user.photoURL || null
        });
      } catch (upErr) {
        console.warn("Não foi possível atualizar auth profile:", upErr);
      }

      // redireciona ao painel principal
      navigate("/painel");
    } catch (err) {
      console.error("Erro ao salvar cadastro:", err);
      setErro(err.message || "Erro ao salvar cadastro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: 720 }}>
      <h3 className="mb-3">Completar Cadastro</h3>

      {erro && <div className="alert alert-danger">{erro}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nome completo</label>
          <input
            type="text"
            className="form-control"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Nome de Guerra</label>
          <input
            type="text"
            className="form-control"
            value={nomeDeGuerra}
            onChange={(e) => setNomeDeGuerra(e.target.value)}
          />
        </div>

        <div className="row">
          <div className="mb-3 col-md-6">
            <label className="form-label">Posto / Graduação</label>
            <input
              type="text"
              className="form-control"
              value={posto}
              onChange={(e) => setPosto(e.target.value)}
              required
            />
          </div>

          <div className="mb-3 col-md-6">
            <label className="form-label">Função</label>
            <input
              type="text"
              className="form-control"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="row">
          <div className="mb-3 col-md-6">
            <label className="form-label">Setor</label>
            <input
              type="text"
              className="form-control"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
            />
          </div>

          <div className="mb-3 col-md-6">
            <label className="form-label">Telefone</label>
            <input
              type="tel"
              className="form-control"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(xx) xxxxx-xxxx"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Email (não editável)</label>
          <input
            type="email"
            className="form-control"
            value={email}
            disabled
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Foto de perfil (opcional)</label>
          <input
            type="file"
            accept="image/*"
            className="form-control"
            onChange={handleFileChange}
          />
          {preview && (
            <div className="mt-2">
              <p className="mb-1">Pré-visualização:</p>
              <img
                src={preview}
                alt="preview"
                style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }}
              />
            </div>
          )}
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Cadastro"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/")}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

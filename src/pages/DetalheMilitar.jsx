import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function DetalheMilitar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [m, setM] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "militares", id));
        if (!snap.exists()) return setErro("Registro não encontrado.");
        setM({ id: snap.id, ...snap.data() });
      } catch (e) {
        setErro("Falha ao carregar militar.");
      }
    })();
  }, [id]);

  if (erro) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{erro}</div>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>
    );
  }
  if (!m) return <div className="p-4">Carregando…</div>;

  const funcao = m.funcao || m.lotacaoAtual || "-"; // retro-compat.

  return (
    <div className="container py-3">
      <button className="btn btn-outline-secondary mb-3" onClick={() => navigate(-1)}>
        Voltar
      </button>

      <div className="bg-white rounded shadow p-3 mb-3">
        <h5 className="mb-3">Dados do Militar</h5>
        <div className="row g-2">
          <div className="col-md-3">
            <div className="text-muted small">Posto</div>
            <div className="fw-semibold">{m.posto || "-"}</div>
          </div>
          <div className="col-md-5">
            <div className="text-muted small">Nome</div>
            <div className="fw-semibold">{m.nome || "-"}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted small">Nome de Guerra</div>
            <div className="fw-semibold">{m.nomeDeGuerra || "-"}</div>
          </div>

          <div className="col-md-3">
            <div className="text-muted small">Situação</div>
            <div className="fw-semibold">{m.situacao || "-"}</div>
          </div>
          <div className="col-md-5">
            <div className="text-muted small">Função</div>
            <div className="fw-semibold">{funcao}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted small">Matrícula</div>
            <div className="fw-semibold">{m.matricula || "-"}</div>
          </div>

          <div className="col-md-3">
            <div className="text-muted small">Telefone</div>
            <div className="fw-semibold">{m.telefone || "-"}</div>
          </div>
          <div className="col-md-5">
            <div className="text-muted small">E-mail</div>
            <div className="fw-semibold">{m.email || "-"}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted small">RG Bombeiro</div>
            <div className="fw-semibold">{m.rgBombeiro || "-"}</div>
          </div>
        </div>
      </div>

      {/* Aqui permanecem suas abas de Movimentações/Anexos etc. */}
    </div>
  );
}

// src/components/B1/Movimentacoes.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../services/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

const TIPOS = ["Promoção", "Transferência", "Licença", "Agregação"];

function toDateStr(v) {
  if (!v) return "—";
  const dt = v?.toDate ? v.toDate() : new Date(v);
  return isNaN(+dt) ? "—" : dt.toLocaleDateString();
}

export default function Movimentacoes({ militarId }) {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState({
    tipo: TIPOS[0],
    inicio: "",
    fim: "",
    detalhes: "",
  });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!militarId) return;
    const q = query(
      collection(db, `militares/${militarId}/movimentacoes`),
      orderBy("inicio", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [militarId]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      if (!militarId) throw new Error("Selecione um militar.");
      if (!form.tipo || !form.inicio)
        throw new Error("Tipo e início são obrigatórios.");

      await addDoc(collection(db, `militares/${militarId}/movimentacoes`), {
        tipo: form.tipo,
        inicio: form.inicio ? new Date(form.inicio) : null,
        fim: form.fim ? new Date(form.fim) : null,
        detalhes: form.detalhes || "",
        criadoEm: serverTimestamp(),
      });

      setForm({ tipo: TIPOS[0], inicio: "", fim: "", detalhes: "" });
    } catch (err) {
      setErro(err.message || "Falha ao salvar movimentação.");
    } finally {
      setLoading(false);
    }
  }

  async function remover(id) {
    if (!window.confirm("Remover esta movimentação?")) return;
    try {
      await deleteDoc(doc(db, `militares/${militarId}/movimentacoes/${id}`));
    } catch (err) {
      alert("Não foi possível remover.");
      console.error(err);
    }
  }

  if (!militarId)
    return (
      <div className="alert alert-info">
        Selecione um militar para ver as movimentações.
      </div>
    );

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        <h6 className="mb-2">Nova movimentação</h6>
        {erro && <div className="alert alert-danger">{erro}</div>}
        <form onSubmit={salvar} className="bg-white p-3 rounded shadow-sm">
          <div className="mb-2">
            <label className="form-label">Tipo</label>
            <select
              name="tipo"
              className="form-select"
              value={form.tipo}
              onChange={onChange}
            >
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="row">
            <div className="col-md-6 mb-2">
              <label className="form-label">Início</label>
              <input
                type="date"
                name="inicio"
                className="form-control"
                value={form.inicio}
                onChange={onChange}
                required
              />
            </div>
            <div className="col-md-6 mb-2">
              <label className="form-label">Fim</label>
              <input
                type="date"
                name="fim"
                className="form-control"
                value={form.fim}
                onChange={onChange}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Detalhes/Observações</label>
            <textarea
              name="detalhes"
              className="form-control"
              rows={3}
              value={form.detalhes}
              onChange={onChange}
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>

      <div className="col-lg-7">
        <h6 className="mb-2">Histórico</h6>
        <div className="table-responsive bg-white rounded shadow-sm">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Tipo</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Detalhes</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id}>
                  <td>{m.tipo}</td>
                  <td>{toDateStr(m.inicio)}</td>
                  <td>{toDateStr(m.fim)}</td>
                  <td className="text-truncate" style={{ maxWidth: 260 }}>
                    {m.detalhes || "—"}
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => remover(m.id)}
                      title="Remover"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    Sem movimentações.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

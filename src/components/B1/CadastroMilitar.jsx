// src/components/B1/CadastroMilitar.jsx
import React, { useState } from "react";
import { db, storage } from "../../services/firebaseConfig";
import {
  addDoc,
  collection,
  serverTimestamp,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const initialState = {
  nome: "",
  nomeDeGuerra: "",
  matricula: "",
  posto: "",
  situacao: "Ativo",
  lotacaoAtual: "",
  telefone: "",
  email: "",
  rgBombeiro: "",
  especializacoes: [],
};

const ESPECIALIZACOES = [
  "Busca e Salvamento",
  "Atendimento Pré-Hospitalar",
  "Mergulho",
  "Combate a Incêndio Urbano",
  "Combate a Incêndio Florestal",
  "Produtos Perigosos",
];

// normaliza para buscas (remove acentos)
const norm = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function CadastroMilitar() {
  const [form, setForm] = useState(initialState);
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }
  function onSpecChange(e) {
    const { value, checked } = e.target;
    setForm((f) => {
      const set = new Set(f.especializacoes);
      checked ? set.add(value) : set.delete(value);
      return { ...f, especializacoes: Array.from(set) };
    });
  }
  function onFile(e) {
    const f = e.target.files?.[0];
    setFoto(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setOk("");
    setLoading(true);
    try {
      if (!form.nome.trim()) throw new Error("Informe o nome.");
      if (!form.matricula.trim()) throw new Error("Informe a matrícula.");
      if (!form.posto.trim()) throw new Error("Informe o posto/graduação.");
      if (!form.lotacaoAtual.trim()) throw new Error("Informe a lotação atual.");
      if (!form.telefone.trim() && !form.email.trim())
        throw new Error("Informe ao menos um contato (telefone ou e-mail).");

      // matrícula única
      const snap = await getDocs(
        query(collection(db, "militares"), where("matricula", "==", form.matricula.trim()))
      );
      if (!snap.empty) throw new Error("Já existe militar com esta matrícula.");

      // cria doc com ID automático (facilita salvar foto com o ID)
      const refDoc = await addDoc(collection(db, "militares"), {
        ...form,
        nomeIndex: norm(form.nome),
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        fotoURL: "",
      });

      // upload da foto (opcional)
      if (foto) {
        const ext = (foto.name.split(".").pop() || "jpg").toLowerCase();
        const r = ref(storage, `militares/fotos/${refDoc.id}.${ext}`);
        await uploadBytes(r, foto);
        const fotoURL = await getDownloadURL(r);
        await setDoc(
          refDoc,
          { fotoURL, atualizadoEm: serverTimestamp() },
          { merge: true }
        );
      }

      setForm(initialState);
      setFoto(null);
      setPreview(null);
      setOk("Militar cadastrado com sucesso!");
    } catch (err) {
      setErro(err.message || "Falha ao cadastrar militar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h5 className="mb-3">Cadastro de Militar (B1)</h5>
      {erro && <div className="alert alert-danger">{erro}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <form onSubmit={handleSubmit} className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Nome completo *</label>
          <input
            name="nome"
            className="form-control"
            value={form.nome}
            onChange={onChange}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Nome de Guerra</label>
          <input
            name="nomeDeGuerra"
            className="form-control"
            value={form.nomeDeGuerra}
            onChange={onChange}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Matrícula *</label>
          <input
            name="matricula"
            className="form-control"
            value={form.matricula}
            onChange={onChange}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Posto/Graduação *</label>
          <input
            name="posto"
            className="form-control"
            value={form.posto}
            onChange={onChange}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Situação *</label>
          <select
            name="situacao"
            className="form-select"
            value={form.situacao}
            onChange={onChange}
          >
            <option>Ativo</option>
            <option>Afastado</option>
            <option>Agregado</option>
            <option>Férias</option>
            <option>Reserva</option>
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Lotação Atual *</label>
          <input
            name="lotacaoAtual"
            className="form-control"
            value={form.lotacaoAtual}
            onChange={onChange}
            placeholder="Ex.: 20º GBM - B1"
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">RG Bombeiro</label>
          <input
            name="rgBombeiro"
            className="form-control"
            value={form.rgBombeiro}
            onChange={onChange}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Telefone</label>
          <input
            name="telefone"
            className="form-control"
            value={form.telefone}
            onChange={onChange}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">E-mail</label>
          <input
            type="email"
            name="email"
            className="form-control"
            value={form.email}
            onChange={onChange}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label d-block">Especializações</label>
          <div className="d-flex flex-wrap gap-3">
            {ESPECIALIZACOES.map((e) => (
              <div className="form-check" key={e}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={e}
                  value={e}
                  onChange={onSpecChange}
                  checked={form.especializacoes.includes(e)}
                />
                <label className="form-check-label" htmlFor={e}>
                  {e}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="col-md-6">
          <label className="form-label">Foto (opcional)</label>
          <input
            type="file"
            className="form-control"
            accept="image/*"
            onChange={onFile}
          />
          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{
                width: 120,
                height: 120,
                objectFit: "cover",
                borderRadius: 8,
                marginTop: 8,
              }}
            />
          )}
        </div>

        <div className="col-12 d-flex gap-2">
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => {
              setForm(initialState);
              setFoto(null);
              setPreview(null);
              setErro("");
              setOk("");
            }}
          >
            Limpar
          </button>
        </div>
      </form>
      <p className="text-muted small mt-2">
        Após salvar, use a tela de <strong>Movimentações</strong> para promoções, licenças e
        transferências, e a tela de <strong>Anexos</strong> no detalhe do militar para documentos.
      </p>
    </div>
  );
}

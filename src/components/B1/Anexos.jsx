// src/components/B1/Anexos.jsx
import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../../services/firebaseConfig";
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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const TIPOS = ["Identidade", "Certificado", "Comprovante", "Outros"];

export default function Anexos({ militarId, militar }) {
  const [file, setFile] = useState(null);
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [obs, setObs] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lista, setLista] = useState([]);

  useEffect(() => {
    if (!militarId) return;
    const q = query(
      collection(db, `militares/${militarId}/anexos`),
      orderBy("criadoEm", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [militarId]);

  async function enviar(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);

    try {
      const user = auth.currentUser;
      const path = `militares/anexos/${militarId}/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      await addDoc(collection(db, `militares/${militarId}/anexos`), {
        nome: file.name,
        url,
        storagePath: path,
        tipo,
        observacao: obs || "",
        tamanho: file.size,
        contentType: file.type,
        criadoEm: serverTimestamp(),
        uploadedBy: user?.uid || null,
      });

      setFile(null);
      setObs("");
      setTipo(TIPOS[0]);
      (document.getElementById("anexo-input") || {}).value = "";
    } catch (err) {
      console.error(err);
      alert("Falha ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  }

  async function remover(anexo) {
    if (!window.confirm("Remover este anexo?")) return;
    try {
      if (anexo.storagePath) {
        await deleteObject(ref(storage, anexo.storagePath));
      }
      await deleteDoc(doc(db, `militares/${militarId}/anexos/${anexo.id}`));
    } catch (err) {
      console.error(err);
      alert("Não foi possível remover.");
    }
  }

  if (!militarId)
    return <div className="alert alert-info">Selecione um militar.</div>;

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        <h6 className="mb-2">Enviar anexo</h6>
        <form onSubmit={enviar} className="bg-white p-3 rounded shadow-sm">
          <div className="mb-2">
            <label className="form-label">Arquivo</label>
            <input
              id="anexo-input"
              type="file"
              className="form-control"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <div className="mb-2">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Observação</label>
            <input
              className="form-control"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <button className="btn btn-primary" disabled={uploading || !file}>
            {uploading ? "Enviando..." : "Enviar"}
          </button>
        </form>
        <p className="text-muted small mt-2">
          Arquivos ficam em <code>Storage / militares/anexos/{militarId}</code>.
        </p>
      </div>

      <div className="col-lg-7">
        <h6 className="mb-2">
          Anexos de {militar?.nomeDeGuerra || militar?.nome}
        </h6>
        <div className="table-responsive bg-white rounded shadow-sm">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Tamanho</th>
                <th style={{ width: 120 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id}>
                  <td className="text-truncate" style={{ maxWidth: 260 }}>
                    {a.nome}
                  </td>
                  <td>{a.tipo || "—"}</td>
                  <td>
                    {a.tamanho ? `${(a.tamanho / 1024).toFixed(1)} KB` : "—"}
                  </td>
                  <td>
                    <a
                      className="btn btn-sm btn-outline-primary me-2"
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir
                    </a>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => remover(a)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    Nenhum anexo enviado.
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

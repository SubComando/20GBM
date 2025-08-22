// src/pages/AdminFerramentas.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../services/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

// remove acentos para índice de busca
const norm = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function AdminFerramentas() {
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState({ ok: 0, skip: 0, fail: 0 });
  const [meRole, setMeRole] = useState("");

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) return;
      try {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        const d = snap.data() || {};
        setMeRole(d.role || "");
      } catch {}
    })();
  }, []);

  async function importarUsuariosParaMilitares() {
    setRunning(true);
    setLog([]);
    setDone({ ok: 0, skip: 0, fail: 0 });

    try {
      const usersSnap = await getDocs(collection(db, "usuarios"));
      for (const uDoc of usersSnap.docs) {
        const u = uDoc.data();
        const milRef = doc(db, "militares", uDoc.id);
        const milSnap = await getDoc(milRef);

        if (milSnap.exists()) {
          setDone((d) => ({ ...d, skip: d.skip + 1 }));
          setLog((l) => [
            ...l,
            `↪️ ${u.nome || u.email}: já existe em "militares" (pulado)`,
          ]);
          continue;
        }

        const payload = {
          nome: u.nome || "",
          nomeDeGuerra: u.nomeDeGuerra || "",
          matricula: "", // pode preencher depois na B1
          posto: u.posto || "",
          situacao: "Ativo",
          lotacaoAtual: u.setor ? `20º GBM - ${u.setor}` : "20º GBM",
          telefone: u.telefone || "",
          email: u.email || "",
          rgBombeiro: "",
          especializacoes: [],
          nomeIndex: norm(u.nome || u.nomeDeGuerra || u.email || ""),
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
          fotoURL: u.fotoURL || "",
        };

        try {
          await setDoc(milRef, payload, { merge: true });
          setDone((d) => ({ ...d, ok: d.ok + 1 }));
          setLog((l) => [
            ...l,
            `✅ ${u.nome || u.email}: importado para "militares"`,
          ]);
        } catch (e) {
          setDone((d) => ({ ...d, fail: d.fail + 1 }));
          setLog((l) => [
            ...l,
            `❌ ${u.nome || u.email}: erro ao importar (${e.message})`,
          ]);
        }
      }
      setLog((l) => [...l, "—— fim ——"]);
    } catch (e) {
      setLog((l) => [...l, `Falha geral: ${e.message}`]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 820 }}>
      <h4 className="mb-3">Ferramentas da B1</h4>

      <div className="alert alert-warning">
        <strong>Atenção:</strong> para usar esta página seu usuário precisa ter
        o campo <code>acesso: "total"</code> no documento{" "}
        <code>usuarios/{"{uid}"}</code>.
      </div>

      <div className="bg-white p-3 rounded shadow-sm mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Importar usuários ➜ militares</h6>
          {meRole && (
            <span className="badge text-bg-light">Seu perfil: {meRole}</span>
          )}
        </div>
        <p className="text-muted mt-2 mb-3">
          Cria um registro em <code>militares</code> para cada documento da
          coleção <code>usuarios</code> que ainda não existe em{" "}
          <code>militares</code>. Campos como <em>matrícula</em> podem ser
          preenchidos depois.
        </p>
        <button
          className="btn btn-primary"
          onClick={importarUsuariosParaMilitares}
          disabled={running}
        >
          {running ? "Importando..." : "Importar agora"}
        </button>
        <div className="mt-3 small">
          <span className="me-3">✅ {done.ok} importados</span>
          <span className="me-3">↪️ {done.skip} pulados</span>
          <span className="me-3">❌ {done.fail} erros</span>
        </div>
      </div>

      <div className="bg-white p-3 rounded shadow-sm">
        <h6 className="mb-2">Log</h6>
        <pre className="small mb-0" style={{ whiteSpace: "pre-wrap" }}>
          {log.join("\n")}
        </pre>
      </div>
    </div>
  );
}

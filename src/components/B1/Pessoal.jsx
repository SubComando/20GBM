import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// normaliza p/ ordenar/buscar
const norm = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Hierarquia: CEL, TCEL, MAJ, CAP, 1TEN, 2TEN, ST, 1SGT, 2SGT, 3SGT, CB, SD */
const POSTO_ORDER_GROUPS = [
  ["cel", "cel.", "coronel"],
  ["tcel", "ten cel", "ten cel.", "ten.-cel.", "tenente coronel", "tenente-coronel"],
  ["maj", "major"],
  ["cap", "capitao", "capitão"],
  ["1ten", "1º ten", "1 ten", "1o tenente", "1º tenente", "primeiro tenente"],
  ["2ten", "2º ten", "2 ten", "2o tenente", "2º tenente", "segundo tenente"],
  ["st", "subtenente", "sub tenente", "sub-tenente"],
  ["1sgt", "1º sargento", "1o sargento", "primeiro sargento", "1 sgt", "1º sgt"],
  ["2sgt", "2º sargento", "2o sargento", "segundo sargento", "2 sgt", "2º sgt"],
  ["3sgt", "3º sargento", "3o sargento", "terceiro sargento", "3 sgt", "3º sgt"],
  ["cb", "c b", "cabo"],
  ["sd", "soldado"],
];
const containsAlias = (normalizedText, alias) => {
  const a = norm(alias);
  if (!a) return false;
  if (normalizedText === a) return true;
  if (normalizedText.startsWith(a + " ")) return true;
  if (normalizedText.endsWith(" " + a)) return true;
  return normalizedText.includes(" " + a + " ");
};
const postoPriority = (p) => {
  const n = norm(p || "");
  if (!n) return 999;
  for (let i = 0; i < POSTO_ORDER_GROUPS.length; i++) {
    for (const alias of POSTO_ORDER_GROUPS[i]) {
      if (containsAlias(n, alias) || n.startsWith(norm(alias))) return i;
    }
  }
  return 999;
};

// ====== CSV (com Função) ======
function toCSV(rows) {
  const headers = [
    "Posto",
    "Nome",
    "Nome de Guerra",
    "Situação",
    "Função",
    "Matrícula",
    "Telefone",
    "E-mail",
  ];
  const lines = [headers.join(";")];
  rows.forEach((r) => {
    const funcao = r.funcao || r.lotacaoAtual || ""; // retro-compat.
    lines.push(
      [
        r.posto || "",
        r.nome || "",
        r.nomeDeGuerra || "",
        r.situacao || "",
        funcao,
        r.matricula || "",
        r.telefone || "",
        r.email || "",
      ]
        .map((v) => (v ?? "").toString().replace(/;/g, ","))
        .join(";")
    );
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "efetivo.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Pessoal() {
  const navigate = useNavigate();
  const [militares, setMilitares] = useState([]);
  const [erro, setErro] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const fallbackAttached = useRef(false);

  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState({
    situacao: "",
    posto: "",
    funcao: "",
  });
  const [showAvancada, setShowAvancada] = useState(false);

  // modal de edição
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    nomeDeGuerra: "",
    matricula: "",
    posto: "",
    situacao: "Ativo",
    funcao: "",
    telefone: "",
    email: "",
    rgBombeiro: "",
  });
  const [saving, setSaving] = useState(false);
  const [erroEdit, setErroEdit] = useState("");

  useEffect(() => {
    // primeiro: coleção oficial "militares"
    const qMil = query(collection(db, "militares"), orderBy("nomeIndex"));
    const unsubMil = onSnapshot(
      qMil,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (list.length > 0) {
          setMilitares(list);
          setErro("");
          setUsingFallback(false);
        } else {
          attachUsuariosFallback();
        }
      },
      (err) => {
        console.error("Erro ao listar militares:", err);
        setErro(
          err?.code === "permission-denied"
            ? 'Sem permissão para ler "militares". Exibindo "usuarios" como fallback (somente leitura).'
            : "Falha ao carregar militares. Tentando fallback para 'usuarios'."
        );
        attachUsuariosFallback();
      }
    );

    function attachUsuariosFallback() {
      if (fallbackAttached.current) return;
      fallbackAttached.current = true;
      setUsingFallback(true);
      const unsubUsers = onSnapshot(
        collection(db, "usuarios"),
        (snap) => {
          const list = snap.docs.map((d) => {
            const u = d.data() || {};
            return {
              id: d.id,
              nome: u.nome || "",
              nomeDeGuerra: u.nomeDeGuerra || "",
              posto: u.posto || "",
              situacao: "Ativo",
              funcao: u.funcao || (u.setor ? `20º GBM - ${u.setor}` : ""), // preferir funcao
              matricula: "",
              telefone: u.telefone || "",
              email: u.email || "",
              _fromUsuarios: true,
            };
          });
          setMilitares(list);
        },
        (err) => {
          console.error("Erro ao listar usuarios (fallback):", err);
          setErro("Falha ao carregar dados, verifique as regras e a conexão.");
        }
      );
      return () => unsubUsers();
    }

    return () => unsubMil();
  }, []);

  const listada = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const filtrada = militares.filter((m) => {
      const funcao = m.funcao || m.lotacaoAtual || ""; // retro-compat.
      const text = [m.posto, m.nome, m.nomeDeGuerra, m.matricula, funcao]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const passBusca = !b || text.includes(b);
      const passSit = !filtros.situacao || m.situacao === filtros.situacao;
      const passPosto = !filtros.posto || m.posto === filtros.posto;
      const passFunc = !filtros.funcao || funcao === filtros.funcao;
      return passBusca && passSit && passPosto && passFunc;
    });

    // ordena: Posto (hierarquia) -> Nome -> Guerra
    return filtrada.sort((a, b) => {
      const pa = postoPriority(a.posto);
      const pb = postoPriority(b.posto);
      if (pa !== pb) return pa - pb;
      const na = norm(a.nome || "");
      const nb = norm(b.nome || "");
      if (na !== nb) return na < nb ? -1 : 1;
      const ga = norm(a.nomeDeGuerra || "");
      const gb = norm(b.nomeDeGuerra || "");
      if (ga !== gb) return ga < gb ? -1 : 1;
      return 0;
    });
  }, [busca, filtros, militares]);

  const opcoesPosto = useMemo(
    () =>
      Array.from(new Set(militares.map((m) => m.posto).filter(Boolean))).sort(
        (a, b) => postoPriority(a) - postoPriority(b)
      ),
    [militares]
  );
  const opcoesFuncao = useMemo(
    () =>
      Array.from(
        new Set(
          militares
            .map((m) => m.funcao || m.lotacaoAtual) // retro-compat.
            .filter(Boolean)
        )
      ).sort((a, b) => norm(a).localeCompare(norm(b))),
    [militares]
  );

  function openEdit(m) {
    if (m._fromUsuarios) return;
    setEditing(m);
    setErroEdit("");
    setForm({
      nome: m.nome || "",
      nomeDeGuerra: m.nomeDeGuerra || "",
      matricula: m.matricula || "",
      posto: m.posto || "",
      situacao: m.situacao || "Ativo",
      funcao: m.funcao || m.lotacaoAtual || "",
      telefone: m.telefone || "",
      email: m.email || "",
      rgBombeiro: m.rgBombeiro || "",
    });
  }
  function closeEdit() {
    setEditing(null);
    setSaving(false);
    setErroEdit("");
  }
  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function salvarEdicao(e) {
    e?.preventDefault?.();
    if (!editing?.id) return;
    setErroEdit("");
    setSaving(true);
    try {
      if (!form.nome.trim()) throw new Error("Informe o nome.");
      if (!form.posto.trim()) throw new Error("Informe o posto/graduação.");
      if (!form.funcao.trim()) throw new Error("Informe a função.");

      await updateDoc(doc(db, "militares", editing.id), {
        nome: form.nome,
        nomeDeGuerra: form.nomeDeGuerra || "",
        matricula: form.matricula || "",
        posto: form.posto,
        situacao: form.situacao || "Ativo",
        funcao: form.funcao,
        telefone: form.telefone || "",
        email: form.email || "",
        rgBombeiro: form.rgBombeiro || "",
        nomeIndex: norm(form.nome),
        atualizadoEm: serverTimestamp(),
      });

      closeEdit();
    } catch (err) {
      console.error(err);
      setErroEdit(err.message || "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function exportarPeculioPDF() {
    const data = listada;
    const now = new Date();
    const titulo = `Pecúlio - 20º GBM - ${now.toLocaleDateString()} ${now
      .toTimeString()
      .slice(0, 5)}`;

    const css = `
      <style>
        @page { size: A4 landscape; margin: 16mm; }
        body { font-family: Arial, Helvetica, sans-serif; }
        h1 { font-size: 18pt; margin: 0 0 8px 0; }
        .muted { color: #666; font-size: 10pt; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        th, td { border: 1px solid #444; padding: 6px 8px; }
        th { background: #f0f0f0; text-align: left; }
        .nowrap { white-space: nowrap; }
        footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 9pt; color:#666; }
      </style>
    `;

    const header = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div>
          <h1>${titulo}</h1>
          <div class="muted">Efetivo listado: ${data.length} militar(es)</div>
        </div>
        <div style="text-align:right;">
          <div class="muted">Gerado por Sistema 20º GBM</div>
        </div>
      </div>
    `;

    const rows = data
      .map((m) => {
        const funcao = m.funcao || m.lotacaoAtual || "-";
        return `
        <tr>
          <td>${m.posto || "-"}</td>
          <td class="nowrap">${m.nome || "-"}</td>
          <td class="nowrap">${m.nomeDeGuerra || "-"}</td>
          <td>${m.situacao || "-"}</td>
          <td>${funcao}</td>
          <td class="nowrap">${m.matricula || "-"}</td>
          <td class="nowrap">${m.telefone || "-"}</td>
          <td>${m.email || "-"}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          ${css}
          <title>${titulo}</title>
        </head>
        <body>
          ${header}
          <table>
            <thead>
              <tr>
                <th>Posto</th>
                <th>Nome</th>
                <th>Nome de Guerra</th>
                <th>Situação</th>
                <th>Função</th>
                <th>Matrícula</th>
                <th>Telefone</th>
                <th>E-mail</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <footer>
            <div style="display:flex;justify-content:space-between;">
              <span>20º Grupamento Bombeiro Militar</span>
              <span>Impresso em ${now.toLocaleString()}</span>
            </div>
          </footer>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) {
      alert("Bloqueio de pop-up ativo. Permita pop-ups para gerar o PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <h5 className="m-0">Efetivo – B1 / Pessoal</h5>
        <div className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            style={{ maxWidth: 340 }}
            placeholder="Busca rápida (posto, nome, função ou matrícula)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button className="btn btn-outline-secondary" onClick={() => setShowAvancada((v) => !v)}>
            {showAvancada ? "Ocultar filtros" : "Filtros"}
          </button>
          <button className="btn btn-outline-primary" onClick={() => toCSV(listada)}>
            Excel (CSV)
          </button>
          <button className="btn btn-danger" onClick={exportarPeculioPDF} title="Gerar Pecúlio (PDF)">
            Pecúlio (PDF)
          </button>
        </div>
      </div>

      {usingFallback && (
        <div className="alert alert-info">
          Exibindo dados da coleção <code>usuarios</code> (somente leitura). Para ativar edição e recursos completos, acesse{" "}
          <a className="alert-link" href="/admin/ferramentas">/admin/ferramentas</a> e clique em <strong>Importar agora</strong> para popular <code>militares</code>.
        </div>
      )}
      {erro && <div className="alert alert-warning">{erro}</div>}

      {showAvancada && (
        <div className="bg-white p-3 rounded shadow mb-3">
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label">Situação</label>
              <select
                className="form-select"
                value={filtros.situacao}
                onChange={(e) => setFiltros((f) => ({ ...f, situacao: e.target.value }))}
              >
                <option value="">Todas</option>
                <option>Ativo</option>
                <option>Afastado</option>
                <option>Agregado</option>
                <option>Férias</option>
                <option>Reserva</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Posto/Graduação</label>
              <select
                className="form-select"
                value={filtros.posto}
                onChange={(e) => setFiltros((f) => ({ ...f, posto: e.target.value }))}
              >
                <option value="">Todos</option>
                {opcoesPosto.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Função</label>
              <select
                className="form-select"
                value={filtros.funcao}
                onChange={(e) => setFiltros((f) => ({ ...f, funcao: e.target.value }))}
              >
                <option value="">Todas</option>
                {opcoesFuncao.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-secondary w-100"
                onClick={() => setFiltros({ situacao: "", posto: "", funcao: "" })}
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-responsive bg-white rounded shadow">
        <table className="table table-sm table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Posto</th>
              <th>Nome</th>
              <th>Nome de Guerra</th>
              <th>Situação</th>
              <th>Função</th>
              <th>Matrícula</th>
              <th>Contato</th>
              <th style={{ width: 90 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {listada.map((m) => {
              const funcao = m.funcao || m.lotacaoAtual || "-";
              return (
                <tr
                  key={m.id}
                  onClick={() => !m._fromUsuarios && navigate(`/militar/${m.id}`)}
                  style={{ cursor: m._fromUsuarios ? "default" : "pointer" }}
                  title={m._fromUsuarios ? "Disponível após importação" : "Abrir detalhe"}
                >
                  <td>{m.posto || "-"}</td>
                  <td className="fw-medium">{m.nome}</td>
                  <td>{m.nomeDeGuerra || "-"}</td>
                  <td>{m.situacao || "-"}</td>
                  <td>{funcao}</td>
                  <td>{m.matricula || "-"}</td>
                  <td>
                    <div className="small">{m.telefone || "-"}</div>
                    <div className="small text-muted">{m.email || ""}</div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => openEdit(m)}
                      disabled={!!m._fromUsuarios}
                      title={m._fromUsuarios ? "Edite após importar para 'militares'" : "Editar cadastro"}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
            {!listada.length && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-muted">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de edição */}
      {editing && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: "rgba(0,0,0,0.35)", zIndex: 1050 }}
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded shadow p-3"
            style={{
              width: "min(900px, 95vw)",
              maxHeight: "90vh",
              overflow: "auto",
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="m-0">
                Editar: <span className="text-primary">{editing?.nome}</span>
              </h6>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={closeEdit}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={salvarEdicao} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>

            {erroEdit && <div className="alert alert-danger">{erroEdit}</div>}

            <form onSubmit={salvarEdicao} className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Posto/Graduação *</label>
                <input name="posto" className="form-control" value={form.posto} onChange={onChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Nome *</label>
                <input name="nome" className="form-control" value={form.nome} onChange={onChange} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Nome de Guerra</label>
                <input name="nomeDeGuerra" className="form-control" value={form.nomeDeGuerra} onChange={onChange} />
              </div>

              <div className="col-md-3">
                <label className="form-label">Situação *</label>
                <select name="situacao" className="form-select" value={form.situacao} onChange={onChange}>
                  <option>Ativo</option>
                  <option>Afastado</option>
                  <option>Agregado</option>
                  <option>Férias</option>
                  <option>Reserva</option>
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label">Função *</label>
                <input name="funcao" className="form-control" value={form.funcao} onChange={onChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Matrícula</label>
                <input name="matricula" className="form-control" value={form.matricula} onChange={onChange} />
              </div>
              <div className="col-md-3">
                <label className="form-label">RG Bombeiro</label>
                <input name="rgBombeiro" className="form-control" value={form.rgBombeiro} onChange={onChange} />
              </div>

              <div className="col-md-3">
                <label className="form-label">Telefone</label>
                <input name="telefone" className="form-control" value={form.telefone} onChange={onChange} />
              </div>
              <div className="col-md-3">
                <label className="form-label">E-mail</label>
                <input type="email" name="email" className="form-control" value={form.email} onChange={onChange} />
              </div>
            </form>
            <p className="text-muted small mt-3 mb-0">
              Campos com * são obrigatórios. Observação: registros antigos podem ter o campo <code>lotacaoAtual</code>;
              ao editar, passamos a gravar somente <code>funcao</code>.
            </p>
          </div>
        </div>
      )}

      <p className="mt-2 text-muted small">
        Relatórios mais completos: use o módulo <strong>Relatórios</strong> (em breve) para PDF oficial.
      </p>
    </div>
  );
}

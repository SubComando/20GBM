// src/components/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { auth, db } from "../services/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [perfil, setPerfil] = useState({
    nome: "Convidado",
    nomeDeGuerra: "",
    funcao: "",
    setor: "",
    email: "",
  });

  const dropdownRef = useRef(null);

  // Fecha ao clicar fora ou pressionar ESC
  useEffect(() => {
    const onClickOutside = (e) => {
      if (open && dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Carrega perfil: tenta UID -> fallback por e-mail
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setPerfil({ nome: "Convidado", email: "", funcao: "", setor: "", nomeDeGuerra: "" });
        return;
      }
      let dados = {
        nome: user.displayName || "Usuário",
        email: user.email || "",
        funcao: "",
        setor: "",
        nomeDeGuerra: "",
      };

      try {
        // 1) tenta doc com o UID
        const snapUid = await getDoc(doc(db, "usuarios", user.uid));
        if (snapUid.exists()) {
          const d = snapUid.data();
          setPerfil({
            nome: d.nome || dados.nome,
            nomeDeGuerra: d.nomeDeGuerra || "",
            funcao: d.funcao || d.role || "",
            setor: d.setor || "",
            email: d.email || dados.email,
          });
          return;
        }

        // 2) fallback por e-mail (caso o doc tenha sido criado com ID aleatório)
        if (user.email) {
          const q = query(collection(db, "usuarios"), where("email", "==", user.email));
          const r = await getDocs(q);
          if (!r.empty) {
            const d = r.docs[0].data();
            setPerfil({
              nome: d.nome || dados.nome,
              nomeDeGuerra: d.nomeDeGuerra || "",
              funcao: d.funcao || d.role || "",
              setor: d.setor || "",
              email: d.email || dados.email,
            });
            return;
          }
        }

        // 3) não achou nada — usa só dados do Auth
        setPerfil(dados);
      } catch (e) {
        console.warn("Falha ao carregar perfil:", e);
        setPerfil(dados);
      }
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Erro ao sair:", e);
    }
  };

  // Apelido mostrado no botão (prioriza nome de guerra)
  const label = perfil.nomeDeGuerra?.trim() || perfil.nome || "Conta";

  return (
    <header className="bg-danger text-white shadow-sm" style={{ position: "sticky", top: 0, zIndex: 1040 }}>
      {/* Grid com 3 áreas: logo | título (centrado) | usuário */}
      <div
        className="px-3 px-md-4 py-2"
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* ESQUERDA: Logo destacada */}
        <div className="d-flex align-items-center">
          <div
            className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm"
            style={{ width: 44, height: 44 }}
            aria-label="Emblema 20º GBM"
          >
            <img
              src="/image-33.png.webp"
              alt="20º GBM"
              style={{ maxHeight: 30, width: "auto" }}
            />
          </div>
        </div>

        {/* CENTRO: Título realmente centralizado */}
        <div className="text-center" style={{ justifySelf: "center" }}>
          <h1 className="h6 m-0 text-uppercase fw-bold">20º Grupamento Bombeiro Militar</h1>
        </div>

        {/* DIREITA: Conta do usuário */}
        <div className="position-relative" ref={dropdownRef} style={{ justifySelf: "end" }}>
          <button
            className="btn btn-outline-light d-flex align-items-center gap-2"
            type="button"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="d-none d-sm-inline">{label}</span>
            <span className="d-sm-none">Conta</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              fill="currentColor"
              className={`bi bi-caret-down${open ? "-fill" : ""}`}
              viewBox="0 0 16 16"
              aria-hidden
            >
              <path d="M3.204 5h9.592L8 10.481 3.204 5z" />
            </svg>
          </button>

          {open && (
            <div
              className="dropdown-menu dropdown-menu-end show shadow border-0 mt-2"
              style={{ minWidth: 280, right: 0 }}
            >
              <div className="px-3 py-2 border-bottom">
                <p className="mb-1">
                  <strong>Nome:</strong> {perfil.nome}
                </p>
                {perfil.nomeDeGuerra && (
                  <p className="mb-1">
                    <strong>Guerra:</strong> {perfil.nomeDeGuerra}
                  </p>
                )}
                {perfil.funcao && (
                  <p className="mb-1">
                    <strong>Função:</strong> {perfil.funcao}
                  </p>
                )}
                {perfil.setor && (
                  <p className="mb-1">
                    <strong>Setor:</strong> {perfil.setor}
                  </p>
                )}
                {perfil.email && (
                  <p className="mb-0">
                    <strong>Email:</strong> {perfil.email}
                  </p>
                )}
              </div>
              <button className="dropdown-item" onClick={handleSignOut}>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// src/components/Sidebar.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../services/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Sidebar({ onSelectModule }) {
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setPerfil(null);
        return;
      }
      const snap = await getDoc(doc(db, "usuarios", u.uid));
      setPerfil(snap.exists() ? snap.data() : null);
    });
    return () => unsub();
  }, []);

  const canB2 =
    !!perfil &&
    (["comando", "subcomando"].includes(perfil.role) ||
      (perfil.setor === "B2" && ["chefe", "auxiliar"].includes(perfil.b2Nivel)));

  // helper para renderizar item com ícone
  const Item = ({ label, icon, module, variant = "outline-secondary", disabled = false, title }) => (
    <button
      className={`btn w-100 mb-2 btn-${variant} d-flex align-items-center gap-2 justify-content-start`}
      onClick={() => !disabled && onSelectModule(module)}
      disabled={disabled}
      title={title || label}
      style={{ textAlign: "left" }}
    >
      <span aria-hidden="true" style={{ width: 20, display: "inline-block" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="p-3 border-end bg-white" style={{ width: 240 }}>
      <div className="fw-bold mb-2">Módulos</div>

      <Item label="Comando" icon="🏅" module="Comando" />
      <Item label="Subcomando" icon="⭐" module="Subcomando" />
      <Item label="SAT" icon="🏛️" module="SAT" />
      <Item label="Defesa Civil" icon="🏛️" module="Defesa Civil" />
      <Item label="B1" icon="🚒" module="B1" />

      {/* B2 restrito */}
      <Item
        label="B2 (Inteligência)"
        icon="🛠️"
        module="B2"
        variant={canB2 ? "outline-danger" : "outline-secondary"}
        disabled={!canB2}
        title={canB2 ? "Abrir B2" : "Acesso restrito (B2)"}
      />

      <Item label="B3" icon="📦" module="B3" />
      <Item label="B4" icon="📄" module="B4" />
      <Item label="B5" icon="🏅" module="B5" />
    </aside>
  );
}

import React, { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Painel.css"; // CSS customizado

const modulos = [
  { nome: "B1", icone: "🚒", link: "/b1" },
  { nome: "B2", icone: "🛠️", link: "/b2" },
  { nome: "B3", icone: "📦", link: "/b3" },
  { nome: "B4", icone: "📝", link: "/b4" },
  { nome: "B5", icone: "📊", link: "/b5" },
  { nome: "SAT", icone: "🏛️", link: "/sat" },
  { nome: "Defesa Civil", icone: "🏛️", link: "/defesaCivil" },
  { nome: "Subcomando", icone: "⭐", link: "/subcomando" },
  { nome: "Comando", icone: "🎖️", link: "/comando" },
];

export default function Painel() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "usuarios", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUserData({ uid: user.uid, email: user.email, ...docSnap.data() });
          } else {
            // 🔹 Primeiro login → redireciona para completar cadastro
            window.location.href = "/completar-cadastro";
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
        }
      } else {
        window.location.href = "/";
      }
    });

    return () => unsub();
  }, []);

  const logout = () => {
    signOut(auth);
    window.location.href = "/";
  };

  return (
    <div className="painel-container">
      {/* Topo */}
      <header className="topo-siga">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
          <img src="/image-33.png 1.png" alt="Logo 20º GBM" />           
          </div>
          <div className="d-flex align-items-center">          
            <span className="titulo-siga">20º GRUPAMENTO BOMBEIRO MILITAR</span>
          </div>
          <button className="btn btn-light btn-sm" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <div className="conteudo-siga">
        {/* Menu lateral */}
        <aside className="menu-lateral">
          {userData ? (
            <div className="perfil">
              <img
                src={userData.fotoURL || "/foto.jpg"}
                alt="Foto de perfil"
                className="foto-perfil"
              />
              <p><strong>Nome:</strong> {userData.nome || "Não informado"}</p>
              <p><strong>Nome de Guerra:</strong> {userData.nomeDeGuerra || "Não informado"}</p>
              <p><strong>Posto/Graduação:</strong> {userData.posto || "Não informado"}</p>
              <p><strong>Função:</strong> {userData.funcao || "Não informado"}</p>
              <p><strong>Setor:</strong> {userData.setor || "Não informado"}</p>
              <p><strong>Telefone:</strong> {userData.telefone || "Não informado"}</p>
              <p><strong>Email:</strong> {userData.email || "Não informado"}</p>
            </div>
          ) : (
            <p>Carregando dados...</p>
          )}
          <hr />
          <div className="links-uteis">
            <p><strong>Links Úteis</strong></p>
            <a href="https://www.cb.pa.gov.br" target="_blank" rel="noreferrer">Página do CBMPA</a>
            <a href="https://www.seuportal.com" target="_blank" rel="noreferrer">Portal do Servidor</a>
            <a href="https://www.ioepa.com.br" target="_blank" rel="noreferrer">Diário Oficial</a>
          </div>
        </aside>

        {/* Painel de módulos */}
        <main className="painel-modulos container mt-4">
          <div className="row">
            {modulos.map((mod, index) => (
              <div className="col-md-3 col-sm-6 mb-4" key={index}>
                <a href={mod.link} className="text-decoration-none">
                  <div className="card modulo-card text-center">
                    <div className="icone-modulo">{mod.icone}</div>
                    <h6 className="nome-modulo">{mod.nome}</h6>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

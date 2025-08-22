import React, { useState, useEffect } from "react";
import * as B1 from "./B1";

const services = {
  B1: ["Pessoal", "Escalas", "CadastroMilitar"],
  B2: ["Manutenção", "Materiais", "Ofícios"],
  // outros módulos...
};

export default function Tabs({ module }) {
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    setActiveTab(services[module]?.[0] || "");
  }, [module]);

  const renderContent = () => {
    if (module === "B1") {
      switch (activeTab) {
        case "Pessoal":
          return <B1.Pessoal />;
        case "Escalas":
          return <B1.Escalas />;
        case "CadastroMilitar":
          return <B1.CadastroMilitar />;
        default:
          return <p>Selecione um serviço da B1</p>;
      }
    }
    return <p>Conteúdo do módulo {module}</p>;
  };

  return (
    <div>
      <h2 className="h4 fw-bold mb-4">{module}</h2>
      <ul className="nav nav-tabs mb-4">
        {services[module]?.map(s => (
          <li className="nav-item" key={s}>
            <button
              className={`nav-link ${activeTab === s ? "active" : ""}`}
              onClick={() => setActiveTab(s)}
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
      <div className="p-3 bg-white rounded shadow">{renderContent()}</div>
    </div>
  );
}

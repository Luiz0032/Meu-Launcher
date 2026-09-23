import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <main>
      <h1>Meu Launcher</h1>
      <p>Projeto iniciado com sucesso.</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./game.css";

function Game() {
  const [message, setMessage] = useState("Aguardando eventos da live...");
  const [jumps, setJumps] = useState(0);
  const [gifts, setGifts] = useState(0);
  const [jumping, setJumping] = useState(false);
  const [specialAction, setSpecialAction] = useState(false);

  useEffect(() => {
    const removeListener = window.liveAPI.onGameAction((action) => {
      if (action.type === "like") {
        setJumps((value) => value + 1);

        setMessage(
          `@${action.username ?? "usuário"} enviou likes`
        );

        setJumping(false);

        requestAnimationFrame(() => {
          setJumping(true);

          window.setTimeout(() => {
            setJumping(false);
          }, 500);
        });
      }

      if (action.type === "chat") {
        setMessage(
          `@${action.username ?? "usuário"}: ${action.message ?? ""}`
        );
      }

      if (action.type === "gift") {
        const amount = action.amount ?? 1;

        setGifts((value) => value + amount);

        setMessage(
          `@${action.username ?? "usuário"} enviou ${action.giftName ?? "um presente"} x${amount}`
        );

        setSpecialAction(true);

        window.setTimeout(() => {
          setSpecialAction(false);
        }, 900);
      }
    });

    return removeListener;
  }, []);

  return (
    <main className="game">
      <header className="game-header">
        <div>
          <span>LIVE GAME</span>
          <h1>Avatar Runner</h1>
        </div>

        <div className="live-badge">
          ONLINE
        </div>
      </header>

      <section className="game-area">
        <div className="platform">
          <div
            className={[
              "character",
              jumping ? "jumping" : "",
              specialAction ? "special-action" : ""
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="character-head"></div>
            <div className="character-body"></div>
          </div>
        </div>

        <div className="message-box">
          {message}
        </div>
      </section>

      <footer className="game-stats">
        <div>
          <span>Pulos</span>
          <strong>{jumps}</strong>
        </div>

        <div>
          <span>Presentes</span>
          <strong>{gifts}</strong>
        </div>

        <div>
          <span>Status</span>
          <strong>Ativo</strong>
        </div>
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("game-root")!).render(
  <React.StrictMode>
    <Game />
  </React.StrictMode>
);

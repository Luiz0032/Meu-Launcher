import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./game.css";

function Game() {
  const [message, setMessage] = useState("Aguardando eventos da live...");
  const [jumps, setJumps] = useState(0);
  const [gifts, setGifts] = useState(0);

  const [jumping, setJumping] = useState(false);
  const [danceShort, setDanceShort] = useState(false);
  const [danceSpecial, setDanceSpecial] = useState(false);
  const [giftReaction, setGiftReaction] = useState(false);

  useEffect(() => {
    const removeListener = window.liveAPI.onGameAction((event) => {
      console.log("Ação recebida pelo jogo:", event);

      if (event.action === "jump") {
        setJumps((value) => value + 1);

        setMessage(
          `@${event.username ?? "usuário"} enviou likes`
        );

        setJumping(false);

        requestAnimationFrame(() => {
          setJumping(true);

          window.setTimeout(() => {
            setJumping(false);
          }, 500);
        });

        return;
      }

      if (event.action === "showMessage") {
        setMessage(
          `@${event.username ?? "usuário"}: ${event.message ?? ""}`
        );

        return;
      }

      if (event.type === "gift") {
        setGifts((value) => value + (event.amount ?? 1));
      }

      if (event.action === "danceShort") {
        setMessage(
          `@${event.username ?? "usuário"} enviou ${event.giftName ?? "um presente"}`
        );

        setDanceShort(true);

        window.setTimeout(() => {
          setDanceShort(false);
        }, 1200);

        return;
      }

      if (event.action === "danceSpecial") {
        setMessage(
          `@${event.username ?? "usuário"} ativou uma dança especial!`
        );

        setDanceSpecial(true);

        window.setTimeout(() => {
          setDanceSpecial(false);
        }, 1800);

        return;
      }

      if (event.action === "giftReaction") {
        setMessage(
          `@${event.username ?? "usuário"} enviou ${event.giftName ?? "um presente"} x${event.amount ?? 1}`
        );

        setGiftReaction(true);

        window.setTimeout(() => {
          setGiftReaction(false);
        }, 900);
      }
    });

    return removeListener;
  }, []);

  const characterClasses = [
    "character",
    jumping ? "jumping" : "",
    danceShort ? "dance-short" : "",
    danceSpecial ? "dance-special" : "",
    giftReaction ? "gift-reaction" : ""
  ]
    .filter(Boolean)
    .join(" ");

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
          <div className={characterClasses}>
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

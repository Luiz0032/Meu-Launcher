import { useEffect, useState } from "react";
import "./styles.css";

function App() {
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Desconectado");

  const [giftCount, setGiftCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  useEffect(() => {
    const removeListener = window.liveAPI.onTikTokEvent((type, data) => {
      console.log("Evento TikTok:", type, data);

      if (type === "gift") {
        setGiftCount((value) => value + (data.repeatCount ?? 1));
      }

      if (type === "chat" || type === "gift" || type === "like") {
        setEventCount((value) => value + 1);
      }

      if (type === "disconnected") {
        setConnected(false);
        setConnecting(false);
        setStatusMessage("Desconectado");
        setStartTime(null);
      }

      if (type === "error") {
        console.error("TikTok Live:", data.message);
      }
    });

    return removeListener;
  }, []);

  useEffect(() => {
    if (!startTime) {
      setElapsedTime("00:00:00");
      return;
    }

    const updateTimer = () => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;

      setElapsedTime(
        [hours, minutes, remainingSeconds]
          .map((value) => String(value).padStart(2, "0"))
          .join(":")
      );
    };

    updateTimer();

    const interval = window.setInterval(updateTimer, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [startTime]);

  async function handleConnect() {
    if (!username.trim()) {
      setStatusMessage("Informe um usuário");
      return;
    }

    try {
      setConnecting(true);
      setStatusMessage("Conectando...");

      const result = await window.liveAPI.connectTikTok(username);

      if (!result.success) {
        setConnected(false);
        setStatusMessage(result.error ?? "Erro ao conectar");
        return;
      }

      setConnected(true);
      setGiftCount(0);
      setEventCount(0);
      setStartTime(Date.now());

      setStatusMessage(`Conectado em @${result.username}`);
    } catch (error) {
      console.error(error);

      setConnected(false);
      setStatusMessage("Erro ao conectar");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await window.liveAPI.disconnectTikTok();

    setConnected(false);
    setConnecting(false);
    setStatusMessage("Desconectado");
    setStartTime(null);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">L</div>

          <div>
            <h1>Live Launcher</h1>
            <span>TikTok Interactive</span>
          </div>
        </div>

        <nav className="menu">
          <button className="menu-item active">Dashboard</button>
          <button className="menu-item">Jogos</button>
          <button className="menu-item">Eventos</button>
          <button className="menu-item">Configurações</button>
        </nav>

        <div className="version">v0.1.0</div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">PAINEL PRINCIPAL</p>
            <h2>Controle da Live</h2>
          </div>

          <div className={`status ${connected ? "online" : "offline"}`}>
            <span className="status-dot"></span>
            {statusMessage}
          </div>
        </header>

        <section className="connection-card">
          <div>
            <p className="eyebrow">TIKTOK LIVE</p>

            <h3>Conectar à transmissão</h3>

            <p className="description">
              Informe o usuário da conta que estará transmitindo.
            </p>
          </div>

          <div className="connection-form">
            <input
              type="text"
              placeholder="@usuario"
              aria-label="Usuário do TikTok"
              value={username}
              disabled={connected || connecting}
              onChange={(event) => setUsername(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !connected) {
                  handleConnect();
                }
              }}
            />

            {!connected ? (
              <button
                className="primary-button"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? "Conectando..." : "Conectar"}
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={handleDisconnect}
              >
                Desconectar
              </button>
            )}
          </div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>Status</span>
            <strong>{connected ? "Online" : "Offline"}</strong>
          </div>

          <div className="stat-card">
            <span>Presentes recebidos</span>
            <strong>{giftCount}</strong>
          </div>

          <div className="stat-card">
            <span>Eventos</span>
            <strong>{eventCount}</strong>
          </div>

          <div className="stat-card">
            <span>Tempo ativo</span>
            <strong>{elapsedTime}</strong>
          </div>
        </section>

        <section className="games-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">JOGOS</p>
              <h3>Escolha uma experiência</h3>
            </div>
          </div>

          <div className="game-grid">
            <article className="game-card">
              <div className="game-preview">
                <span>ROBLOX</span>
              </div>

              <div className="game-info">
                <h4>Avatar Live</h4>

                <p>
                  Personagem automático preparado para reagir aos eventos da live.
                </p>

                <button className="secondary-button">
                  Selecionar
                </button>
              </div>
            </article>

            <article className="game-card disabled">
              <div className="game-preview">
                <span>EM BREVE</span>
              </div>

              <div className="game-info">
                <h4>Game 02</h4>

                <p>
                  Espaço reservado para nosso próximo jogo interativo.
                </p>

                <button className="secondary-button" disabled>
                  Indisponível
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

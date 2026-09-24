import { useEffect, useState } from "react";
import type { PresetConfig, PresetAction } from "./types/preset";
import SettingsPanel from "./components/SettingsPanel";
import type { LiveEvent, GameAction } from "./types/live";
import "./styles.css";

function App() {
  const [page, setPage] = useState<
    "dashboard" | "events" | "settings"
  >("dashboard");

  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Desconectado");

  const [giftCount, setGiftCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [gameActions, setGameActions] = useState<GameAction[]>([]);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  const [likeAction, setLikeAction] = useState<PresetAction>("jump");
  const [chatAction, setChatAction] = useState<PresetAction>("showMessage");
  const [gifts, setGifts] = useState<PresetConfig["gifts"]>({
    Rose: {
      action: "danceShort"
    },
    TikTok: {
      action: "danceSpecial"
    },
    default: {
      action: "giftReaction"
    }
  });

  const [presetStatus, setPresetStatus] = useState("");

  useEffect(() => {
    async function loadPreset() {
      const result = await window.liveAPI.getPreset();

      if (!result.success || !result.preset) {
        return;
      }

      setLikeAction(result.preset.like?.action ?? "jump");
      setChatAction(result.preset.chat?.action ?? "showMessage");

      setGifts(
        result.preset.gifts ?? {
          default: {
            action: "giftReaction"
          }
        }
      );
    }

    loadPreset();
  }, []);

  useEffect(() => {
    const removeTikTokListener = window.liveAPI.onTikTokEvent(
      (type, data) => {
        console.log("Evento TikTok:", type, data);

        if (type === "chat" || type === "gift" || type === "like") {
          setEventCount((value) => value + 1);

          const eventUsername = data.username ?? "desconhecido";
          let description = "";

          if (type === "chat") {
            description = data.comment ?? "";
          }

          if (type === "like") {
            description = `+${data.likeCount ?? 0} likes`;
          }

          if (type === "gift") {
            const repeatCount = data.repeatCount ?? 1;

            description =
              `${data.giftName ?? "Presente"} x${repeatCount}`;

            setGiftCount((value) => value + repeatCount);
          }

          const newEvent: LiveEvent = {
            id: Date.now() + Math.random(),
            type,
            username: eventUsername,
            description,
            time: new Date().toLocaleTimeString("pt-BR")
          };

          setEvents((currentEvents) =>
            [newEvent, ...currentEvents].slice(0, 100)
          );
        }

        if (type === "connection_lost") {
          setConnected(false);
          setConnecting(true);
          setStatusMessage("Conexão perdida");
        }

        if (type === "reconnecting") {
          setConnected(false);
          setConnecting(true);

          setStatusMessage(
            `Reconectando... ${data.attempt}/${data.maxAttempts}`
          );
        }

        if (type === "reconnected") {
          setConnected(true);
          setConnecting(false);

          setStatusMessage(
            `Reconectado em @${data.username}`
          );
        }

        if (type === "reconnect_error") {
          console.error(
            "Erro na reconexão:",
            data.message
          );
        }

        if (type === "reconnect_failed") {
          setConnected(false);
          setConnecting(false);
          setStatusMessage(
            "Não foi possível reconectar"
          );
          setStartTime(null);
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
      }
    );

    const removeGameActionListener =
      window.liveAPI.onGameAction((action) => {
        const newAction: GameAction = {
          id: Date.now() + Math.random(),
          ...action,
          time: new Date().toLocaleTimeString("pt-BR")
        };

        setGameActions((currentActions) =>
          [newAction, ...currentActions].slice(0, 50)
        );
      });

    return () => {
      removeTikTokListener();
      removeGameActionListener();
    };
  }, []);

  useEffect(() => {
    if (!startTime) {
      setElapsedTime("00:00:00");
      return;
    }

    const updateTimer = () => {
      const seconds = Math.floor(
        (Date.now() - startTime) / 1000
      );

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

      const result =
        await window.liveAPI.connectTikTok(username);

      if (!result.success) {
        setConnected(false);
        setStatusMessage(
          result.error ?? "Erro ao conectar"
        );
        return;
      }

      setConnected(true);
      setGiftCount(0);
      setEventCount(0);
      setEvents([]);
      setGameActions([]);
      setStartTime(Date.now());

      setStatusMessage(
        `Conectado em @${result.username}`
      );
    } catch (error) {
      console.error(error);
      setConnected(false);
      setStatusMessage("Erro ao conectar");
    } finally {
      setConnecting(false);
    }
  }

  async function handleLocalConnect() {
    if (!username.trim()) {
      setStatusMessage("Informe um usuário");
      return;
    }

    try {
      setConnecting(true);
      setStatusMessage("Conectando localmente...");

      const result =
        await window.liveAPI.connectLocalTikTok(username);

      if (!result.success) {
        setConnected(false);
        setStatusMessage(
          result.error ?? "Erro ao conectar localmente"
        );
        return;
      }

      setConnected(true);
      setGiftCount(0);
      setEventCount(0);
      setEvents([]);
      setGameActions([]);
      setStartTime(Date.now());

      setStatusMessage(
        `Conectado localmente em @${result.username}`
      );
    } catch (error) {
      console.error(error);
      setConnected(false);
      setStatusMessage(
        "Erro ao conectar localmente"
      );
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await Promise.allSettled([
      window.liveAPI.disconnectTikTok(),
      window.liveAPI.disconnectLocalTikTok()
    ]);

    setConnected(false);
    setConnecting(false);
    setStatusMessage("Desconectado");
    setStartTime(null);
  }

  async function handleOpenGame() {
    const result = await window.liveAPI.openGame();

    if (!result.success) {
      console.error(
        "Erro ao abrir jogo:",
        result.error
      );
    }
  }

  async function handleSavePreset() {
    const preset: PresetConfig = {
      like: {
        action: likeAction
      },
      chat: {
        action: chatAction
      },
      gifts
    };

    setPresetStatus("Salvando...");

    const result =
      await window.liveAPI.savePreset(preset);

    if (result.success) {
      setPresetStatus("Configurações salvas com sucesso.");
    } else {
      setPresetStatus(
        result.error ?? "Erro ao salvar configurações."
      );
    }
  }

  function clearEvents() {
    setEvents([]);
  }

  function formatGameAction(action: GameAction) {
    if (action.type === "chat") {
      return action.message ?? "";
    }

    if (action.type === "like") {
      return `Quantidade: ${action.amount ?? 0}`;
    }

    if (action.type === "gift") {
      return `${action.giftName ?? "Presente"} x${action.amount ?? 1}`;
    }

    return "Ação recebida";
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
          <button
            className={`menu-item ${
              page === "dashboard" ? "active" : ""
            }`}
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </button>

          <button className="menu-item">
            Jogos
          </button>

          <button
            className={`menu-item ${
              page === "events" ? "active" : ""
            }`}
            onClick={() => setPage("events")}
          >
            Eventos
          </button>

          <button
            className={`menu-item ${
              page === "settings" ? "active" : ""
            }`}
            onClick={() => setPage("settings")}
          >
            Configurações
          </button>
        </nav>

        <div className="version">v0.1.0</div>
      </aside>

      <main className="content">
        {page === "dashboard" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">
                  PAINEL PRINCIPAL
                </p>
                <h2>Controle da Live</h2>
              </div>

              <div
                className={`status ${
                  connected ? "online" : "offline"
                }`}
              >
                <span className="status-dot"></span>
                {statusMessage}
              </div>
            </header>

            <section className="connection-card">
              <div>
                <p className="eyebrow">
                  TIKTOK LIVE
                </p>

                <h3>Conectar à transmissão</h3>

                <p className="description">
                  Informe o usuário da conta que estará
                  transmitindo.
                </p>
              </div>

              <div className="connection-form">
                <input
                  type="text"
                  placeholder="@usuario"
                  value={username}
                  disabled={connected || connecting}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                />

                {!connected ? (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="primary-button"
                      onClick={handleConnect}
                      disabled={connecting}
                    >
                      {connecting
                        ? "Conectando..."
                        : "Conectar"}
                    </button>

                    <button
                      className="primary-button"
                      onClick={handleLocalConnect}
                      disabled={connecting}
                    >
                      {connecting
                        ? "Conectando..."
                        : "Conectar localmente"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="primary-button"
                      onClick={handleDisconnect}
                    >
                      Desconectar
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="stats">
              <div className="stat-card">
                <span>Status</span>
                <strong>
                  {connected ? "Online" : "Offline"}
                </strong>
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
                    <span>AVATAR RUNNER</span>
                  </div>

                  <div className="game-info">
                    <h4>Avatar Live</h4>

                    <p>
                      Personagem automático preparado para
                      reagir aos eventos da live.
                    </p>

                    <button
                      className="secondary-button"
                      onClick={handleOpenGame}
                    >
                      Abrir jogo
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
                      Espaço reservado para nosso próximo
                      jogo interativo.
                    </p>

                    <button
                      className="secondary-button"
                      disabled
                    >
                      Indisponível
                    </button>
                  </div>
                </article>
              </div>
            </section>

            <section className="actions-panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">
                    MOTOR DE AÇÕES
                  </p>

                  <h3>
                    Últimas ações processadas
                  </h3>
                </div>
              </div>

              <div className="actions-list">
                {gameActions.length === 0 ? (
                  <div className="empty-actions">
                    Nenhuma ação processada ainda.
                  </div>
                ) : (
                  gameActions
                    .slice(0, 8)
                    .map((action) => (
                      <div
                        className="action-row"
                        key={action.id}
                      >
                        <div className="action-type">
                          {action.type.toUpperCase()}
                        </div>

                        <div className="action-content">
                          <strong>
                            @{action.username ??
                              "desconhecido"}
                          </strong>

                          <span>
                            {formatGameAction(action)}
                          </span>
                        </div>

                        <div className="action-time">
                          {action.time}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>
          </>
        )}

        {page === "events" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">
                  MONITORAMENTO
                </p>
                <h2>Eventos da Live</h2>
              </div>
            </header>

            <section className="events-panel">
              <div className="events-header">
                <div>
                  <h3>Eventos em tempo real</h3>
                  <p>
                    Últimos eventos recebidos da
                    transmissão.
                  </p>
                </div>

                <button
                  className="secondary-button clear-events-button"
                  onClick={clearEvents}
                >
                  Limpar
                </button>
              </div>

              <div className="events-list">
                {events.length === 0 ? (
                  <div className="empty-events">
                    Nenhum evento recebido ainda.
                  </div>
                ) : (
                  events.map((event) => (
                    <div
                      className="event-row"
                      key={event.id}
                    >
                      <div
                        className={`event-type ${event.type}`}
                      >
                        {event.type.toUpperCase()}
                      </div>

                      <div className="event-content">
                        <strong>
                          @{event.username}
                        </strong>

                        <span>
                          {event.description}
                        </span>
                      </div>

                      <div className="event-time">
                        {event.time}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {page === "settings" && (
          <SettingsPanel
            likeAction={likeAction}
            chatAction={chatAction}
            gifts={gifts}
            presetStatus={presetStatus}
            setLikeAction={setLikeAction}
            setChatAction={setChatAction}
            setGifts={setGifts}
            onSave={handleSavePreset}
          />
        )}
      </main>
    </div>
  );
}

export default App;















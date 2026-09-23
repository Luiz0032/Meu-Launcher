import "./styles.css";

function App() {
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

          <div className="status offline">
            <span className="status-dot"></span>
            Desconectado
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
            />

            <button className="primary-button">
              Conectar
            </button>
          </div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>Status</span>
            <strong>Offline</strong>
          </div>

          <div className="stat-card">
            <span>Presentes recebidos</span>
            <strong>0</strong>
          </div>

          <div className="stat-card">
            <span>Eventos</span>
            <strong>0</strong>
          </div>

          <div className="stat-card">
            <span>Tempo ativo</span>
            <strong>00:00:00</strong>
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


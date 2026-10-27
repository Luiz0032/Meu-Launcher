# MeuLauncher (Live Launcher)

Aplicativo desktop para Windows que conecta uma **LIVE do TikTok** a **jogos locais interativos**. Comentários, likes e presentes da transmissão viram ações no jogo — um personagem pula, dança ou reage em tempo real.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)
![Plataforma](https://img.shields.io/badge/plataforma-Windows-0078D6)
![Electron](https://img.shields.io/badge/Electron-44-47848F)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6)

> O nome do repositório é **MeuLauncher**; dentro do app e no instalador o produto aparece como **Live Launcher**.

---

## Sumário

- [O que o projeto faz](#o-que-o-projeto-faz)
- [Funcionalidades](#funcionalidades)
- [Como funciona](#como-funciona)
- [Tecnologias](#tecnologias)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como executar](#como-executar)
- [Configuração de ações (presets)](#configuração-de-ações-presets)
- [Eventos](#eventos)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Limitações conhecidas](#limitações-conhecidas)
- [Roadmap](#roadmap)

---

## O que o projeto faz

O streamer informa o `@` da conta que está transmitindo, e o Live Launcher passa a escutar a LIVE. Cada evento recebido é traduzido por um **motor de regras** em uma **ação de jogo** (`jump`, `danceShort`, `danceSpecial`, `giftReaction`, `showMessage`), que é enviada para a janela do jogo.

A integração com o TikTok fica isolada do jogo: o jogo só recebe ações já normalizadas e não precisa conhecer nada do protocolo da plataforma. Isso permite trocar o método de conexão sem mexer no jogo — e, no futuro, plugar outros jogos (a primeira experiência externa planejada é no **Roblox**).

## Funcionalidades

**Já implementado no código**

- **Conexão local com a LIVE** — abre a página da transmissão numa janela oculta do Electron e lê o WebSocket da própria página (sem depender de servidores de terceiros para descobrir a sala).
- **Login da conta TikTok** — janela dedicada para entrar na conta, com sessão persistente e indicador de "sessão ativa" na interface.
- **Reconexão automática** — até 5 tentativas com intervalo crescente (2 s, 4 s, 6 s, 8 s, 10 s), com status visível na interface.
- **Motor de regras** — cada tipo de evento é mapeado para uma ação de jogo.
- **Presets editáveis pela interface** — escolha a ação para likes, comentários e para cada presente pelo nome, com uma ação padrão para os demais.
- **Jogo integrado "Avatar Runner"** — janela separada com um personagem que reage às ações, mensagem do último evento e contadores de pulos e presentes.
- **Painel de controle** — dashboard com status da conexão, feed de eventos da LIVE e histórico de ações enviadas ao jogo.
- **Instalador Windows** — empacotamento NSIS via `electron-builder`.
- **Ferramentas de diagnóstico** — script para testar a descoberta da sala de uma LIVE e uma prova de conceito do leitor de WebSocket.

**Planejado** — veja o [Roadmap](#roadmap).

## Como funciona

```text
            ┌────────────────────────────────────────┐
            │  Launcher (React)                      │
            │  Dashboard · Eventos · Configurações   │
            └───────────────┬────────────────────────┘
                            │ IPC (window.liveAPI)
            ┌───────────────▼────────────────────────┐
            │  Processo principal (electron/main.cjs)│
            └──┬─────────────────────────┬───────────┘
               │                         │
┌──────────────▼──────────────┐   ┌──────▼─────────────────────┐
│ Conector TikTok local       │   │ Motor de regras            │
│ local-tiktok.cjs            │──▶│ action-engine.cjs          │
│ janela oculta com a LIVE    │   │ + default-rules.cjs        │
│ + tiktok-browser-preload    │   │ + preset do usuário        │
└─────────────────────────────┘   └──────┬─────────────────────┘
   chat · like · gift                    │ game:action
   + estados de conexão                  ▼
                                  ┌────────────────────────────┐
                                  │ Janela do jogo             │
                                  │ Avatar Runner (game.html)  │
                                  └────────────────────────────┘
```

**Passo a passo da conexão**

1. O launcher normaliza o usuário (remove espaços e o `@`) e abre `https://www.tiktok.com/@usuario/live` numa janela oculta, usando a sessão persistente `persist:tiktok-live`.
2. O preload `tiktok-browser-preload.cjs` intercepta o `WebSocket` da página e repassa abertura, fechamento, erros e mensagens binárias pelo canal IPC `tiktok-browser:websocket`.
3. O processo principal aceita apenas mensagens vindas dessa janela e de endereços `webcast-ws.tiktok.com`.
4. As mensagens são decodificadas com `deserializeWebSocketMessage` (da biblioteca `tiktok-live-connector`) e convertidas em eventos `chat`, `like` e `gift`.
5. A conexão só é dada como estabelecida quando o WebSocket da LIVE abre de fato — página carregada não conta como conectado. Se isso não acontecer em 15 segundos, a tentativa falha com uma mensagem clara.
6. Cada evento passa pelo motor de regras, que emite a ação correspondente para o launcher e para a janela do jogo.

## Tecnologias

| Tecnologia | Uso no projeto |
|---|---|
| Electron 44 | App desktop, janelas, IPC e sessão persistente |
| React 19 + TypeScript | Interface do launcher e do jogo |
| Vite 8 | Dev server e build (duas páginas: `index.html` e `game.html`) |
| `tiktok-live-connector` 2.5 | Decodificação das mensagens da LIVE |
| electron-builder | Geração do instalador Windows (NSIS, x64) |
| concurrently + wait-on | Sobe o Vite e o Electron juntos em desenvolvimento |

## Estrutura do repositório

```text
MeuLauncher/
├── electron/
│   ├── main.cjs                     # Processo principal, janelas e handlers IPC
│   ├── preload.cjs                  # Expõe window.liveAPI para a interface
│   ├── tiktok-browser-preload.cjs   # Intercepta o WebSocket da página da LIVE
│   ├── config/
│   │   └── default-preset.json      # Preset inicial de ações
│   └── services/
│       ├── local-tiktok.cjs         # Conector local (janela oculta + reconexão + login)
│       ├── tiktok.cjs               # Conector direto via tiktok-live-connector (alternativo)
│       ├── action-engine.cjs        # Motor de regras evento → ação
│       ├── default-rules.cjs        # Regras padrão baseadas no preset
│       └── preset-loader.cjs        # Leitura e gravação do preset do usuário
├── src/
│   ├── App.tsx                      # Launcher: dashboard, eventos e configurações
│   ├── components/
│   │   ├── SettingsPanel.tsx        # Ações para likes, comentários e presentes
│   │   └── GiftRulesEditor.tsx      # Regras por nome de presente
│   ├── game/
│   │   ├── main.tsx                 # Jogo "Avatar Runner"
│   │   └── game.css
│   └── types/                       # Tipos de eventos, ações e presets
├── scripts/
│   └── diagnose-tiktok.mjs          # Diagnóstico da descoberta de sala de uma LIVE
├── poc/                             # Prova de conceito do leitor de WebSocket
├── index.html                       # Entrada do launcher
├── game.html                        # Entrada do jogo
├── vite.config.ts
├── electron-builder.yml
└── package.json
```

## Como executar

### Pré-requisitos

- Windows 10 ou 11 (os scripts de desenvolvimento usam `npm.cmd`)
- [Node.js](https://nodejs.org/) LTS recente e npm
- Uma conta TikTok e uma LIVE ativa para testar

### Instalação

```bash
git clone https://github.com/Luiz0032/Meu-Launcher.git
cd Meu-Launcher
npm install
```

### Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev:app` | **Desenvolvimento completo:** sobe o Vite em `localhost:5173` e abre o Electron quando ele estiver pronto |
| `npm run dev` | Só o servidor Vite (interface no navegador, sem `window.liveAPI`) |
| `npm run electron` | Só o Electron (espera o Vite já rodando) |
| `npm run build` | Gera os arquivos da interface em `dist/` |
| `npm run dist` | Build + instalador Windows em `release/` (`LiveLauncher-Setup-<versão>.exe`) |

### Uso

1. Rode `npm run dev:app`.
2. Clique em **Conta TikTok** e faça login (necessário uma vez; a sessão fica salva).
3. Digite o `@` de quem está ao vivo e clique em **Conectar**.
4. Clique em **Abrir jogo** no dashboard. A janela **Avatar Runner** passa a reagir aos eventos.
5. Ajuste as ações em **Configurações** e clique em **Salvar configurações** — as regras são recarregadas na hora.

### Diagnóstico

Para testar se a sala de uma LIVE é encontrada pela biblioteca:

```bash
node scripts/diagnose-tiktok.mjs usuario
```

O script mostra o Room ID em caso de sucesso, ou cada fonte que falhou e o motivo.

## Configuração de ações (presets)

As ações ficam em um arquivo JSON. Na primeira execução, `electron/config/default-preset.json` é copiado como `preset.json` para a pasta de dados do aplicativo (`app.getPath("userData")`, dentro de `%APPDATA%` no Windows). A tela de Configurações edita esse arquivo.

```json
{
  "like": { "action": "jump" },
  "chat": { "action": "danceShort" },
  "gifts": {
    "Rose":    { "action": "giftReaction" },
    "TikTok":  { "action": "danceSpecial" },
    "Galaxy":  { "action": "danceSpecial" },
    "default": { "action": "danceSpecial" }
  }
}
```

| Ação | Efeito no Avatar Runner |
|---|---|
| `jump` | O personagem pula e o contador de pulos aumenta |
| `showMessage` | Mostra `@usuario: comentário` na tela |
| `danceShort` | Dança curta (~1,2 s) |
| `danceSpecial` | Dança especial (~1,8 s) |
| `giftReaction` | Reação ao presente, com nome e quantidade (~0,9 s) |

Presentes são associados pelo **nome** (por exemplo, `Rose`). Qualquer presente sem regra própria usa a ação de `default`.

## Eventos

### Eventos da LIVE (canal `tiktok:event`)

| Evento | Dados |
|---|---|
| `chat` | `username`, `comment` |
| `like` | `username`, `likeCount`, `totalLikeCount` |
| `gift` | `username`, `giftId`, `giftName`, `repeatCount`, `repeatEnd` |

### Estados de conexão (canal `tiktok:event`)

| Evento | Quando ocorre |
|---|---|
| `connection_lost` | O WebSocket da LIVE fechou inesperadamente |
| `reconnecting` | Nova tentativa iniciada (`attempt`, `maxAttempts`) |
| `reconnected` | O WebSocket voltou a abrir |
| `reconnect_error` | Uma tentativa falhou (`message`, `attempt`) |
| `reconnect_failed` | As 5 tentativas se esgotaram |
| `error` | Falha ao carregar a página ou erro no WebSocket (`message`) |
| `disconnected` | A janela da LIVE foi fechada sem desconexão manual |

### Ações de jogo (canal `game:action`)

```ts
{
  type: "like" | "chat" | "gift",
  action: "jump" | "showMessage" | "danceShort" | "danceSpecial" | "giftReaction",
  username?: string,
  amount?: number,      // likes no lote ou quantidade do presente
  message?: string,     // texto do comentário
  giftId?: number,
  giftName?: string
}
```

Esse é o contrato que qualquer jogo precisa consumir — inclusive a futura integração com o Roblox.

## Segurança e privacidade

- Todas as janelas usam `contextIsolation: true` e `nodeIntegration: false`. A interface só acessa o que o `preload.cjs` expõe em `window.liveAPI`.
- O processo principal descarta mensagens de WebSocket que não venham da janela da LIVE ou de `webcast-ws.tiktok.com`.
- A sessão `persist:tiktok-live` guarda os cookies de login do TikTok no computador. Trate essa pasta como dado sensível. A verificação de sessão consulta apenas se os cookies de autenticação existem, sem expor seus valores.
- Nunca versione cookies, sessões, tokens ou o arquivo de preset do usuário. O `.gitignore` já exclui `.env*`, `node_modules/`, `dist/`, `release/` e logs.
- A integração depende do site do TikTok e da biblioteca de decodificação; mudanças externas podem quebrar a compatibilidade sem aviso.

## Limitações conhecidas

- **Somente Windows** por enquanto: o script `dev:app` usa `npm.cmd` e o instalador gera apenas NSIS x64.
- **Sem testes automatizados** (`npm test` ainda é um placeholder).
- **Sem modo de simulação**: para testar eventos é necessária uma LIVE real.
- **Sequências de presentes**: `repeatEnd` é enviado, mas as regras ainda não o filtram. Em sequências (*combos*), um mesmo presente pode disparar a ação mais de uma vez.
- **Entrada de espectadores** (`join`), seguidores e compartilhamentos ainda não são tratados.
- O item **Jogos** do menu ainda não tem tela própria; o jogo é aberto pelo dashboard.
- O conector direto (`tiktok.cjs`) existe como alternativa, mas a interface usa o conector local.
- As versões exibidas divergem: `package.json` indica `1.0.0` e a interface mostra `v0.1.0`.

## Roadmap

### Etapa 1 — Conexão TikTok
- [x] Conector local com janela oculta e leitura do WebSocket
- [x] Login persistente e indicador de sessão
- [x] Reconexão automática com status na interface
- [ ] Validar o fluxo completo em LIVEs reais de diferentes contas
- [ ] Tratar sequências de presentes com `repeatEnd`

### Etapa 2 — Launcher
- [x] Dashboard, feed de eventos e histórico de ações
- [x] Editor de presets com regras por presente
- [ ] Tela **Jogos** para escolher e abrir experiências
- [ ] Logs locais por componente, sem dados sensíveis
- [ ] Unificar a versão exibida com a do `package.json`

### Etapa 3 — Comunicação com jogos externos
- [ ] Documentar e versionar o contrato de ações
- [ ] Bridge/API local restrita a `127.0.0.1`, com token por sessão e verificação de saúde
- [ ] Validação de tipo, tamanho e frequência dos eventos
- [ ] **Modo de simulação** para disparar eventos sem LIVE

### Etapa 4 — Primeira experiência Roblox
- [ ] Template no Roblox Studio (com Rojo, opcional)
- [ ] Mapear presentes para animações e efeitos
- [ ] Fila de ações, prioridade e *cooldown*
- [ ] Overlay com o nome de quem enviou o presente ou comentou

### Etapa 5 — Gerenciamento de jogos
- [ ] Iniciar, encerrar e monitorar processos de jogos
- [ ] Impedir instâncias duplicadas e conflitos de porta
- [ ] Testes automatizados e assinatura do instalador

## Princípios de desenvolvimento

1. **Separação de responsabilidades** — o conector TikTok não conhece o jogo, e o jogo não conhece o TikTok.
2. **Estados confiáveis** — nunca mostrar "conectado" sem o WebSocket aberto.
3. **Segurança por padrão** — IPC restrito, isolamento de contexto e nada sensível nos logs ou no repositório.
4. **Evolução incremental** — validar cada etapa antes de marcar no roadmap.

---

Desenvolvido por [Luiz0032](https://github.com/Luiz0032).

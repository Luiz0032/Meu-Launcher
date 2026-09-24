const {
  BrowserWindow,
  ipcMain,
  session
} = require("electron");

const path = require("path");

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 2000;
const INITIAL_CONNECTION_TIMEOUT = 15000;

let tiktokWindow = null;
let accountWindow = null;
let currentOnEvent = null;
let websocketListenerRegistered = false;

let activeUsername = null;
let liveSocketOpen = false;
let reconnecting = false;
let reconnectAttempt = 0;
let reconnectTimer = null;
let manualDisconnect = false;

let initialConnectionResolve = null;
let initialConnectionReject = null;
let initialConnectionTimer = null;

const connectorPromise =
  import("tiktok-live-connector");

function normalizeUsername(username) {
  return String(username ?? "")
    .trim()
    .replace(/^@/, "");
}

function emitEvent(type, data = {}) {
  if (
    typeof currentOnEvent !== "function"
  ) {
    return;
  }

  Promise.resolve(
    currentOnEvent(type, data)
  ).catch((error) => {
    console.error(
      "[LocalTikTok] Erro ao emitir evento:",
      error
    );
  });
}

function isLiveWebSocket(url) {
  return String(url ?? "")
    .includes("webcast-ws.tiktok.com");
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function clearInitialConnectionWait() {
  if (initialConnectionTimer) {
    clearTimeout(initialConnectionTimer);
    initialConnectionTimer = null;
  }

  initialConnectionResolve = null;
  initialConnectionReject = null;
}

function resolveInitialConnection() {
  const resolve =
    initialConnectionResolve;

  clearInitialConnectionWait();

  if (resolve) {
    resolve();
  }
}

function waitForInitialConnection() {
  if (liveSocketOpen) {
    return Promise.resolve();
  }

  return new Promise(
    (resolve, reject) => {
      initialConnectionResolve =
        resolve;

      initialConnectionReject =
        reject;

      initialConnectionTimer =
        setTimeout(
          () => {
            clearInitialConnectionWait();

            reject(
              new Error(
                "Não foi possível detectar a conexão da TikTok Live dentro do tempo esperado."
              )
            );
          },
          INITIAL_CONNECTION_TIMEOUT
        );
    }
  );
}
function getLiveUrl() {
  if (!activeUsername) {
    return null;
  }

  return (
    `https://www.tiktok.com/` +
    `@${activeUsername}/live`
  );
}

async function decodeFrame(base64) {
  const {
    deserializeWebSocketMessage
  } = await connectorPromise;

  const buffer = Buffer.from(
    base64,
    "base64"
  );

  return await deserializeWebSocketMessage(
    new Uint8Array(buffer)
  );
}

function processDecodedMessage(
  type,
  data
) {
  if (type === "WebcastChatMessage") {
    emitEvent("chat", {
      username:
        data?.user?.uniqueId ??
        "desconhecido",

      comment:
        data?.comment ??
        ""
    });

    return;
  }

  if (type === "WebcastLikeMessage") {
    emitEvent("like", {
      username:
        data?.user?.uniqueId ??
        "desconhecido",

      likeCount:
        Number(
          data?.count ??
          0
        ),

      totalLikeCount:
        Number(
          data?.total ??
          0
        )
    });

    return;
  }

  if (type === "WebcastGiftMessage") {
    emitEvent("gift", {
      username:
        data?.user?.uniqueId ??
        "desconhecido",

      giftId:
        data?.giftId,

      giftName:
        data?.giftDetails?.giftName ??
        data?.gift?.name ??
        `Gift ${data?.giftId ?? ""}`,

      repeatCount:
        Number(
          data?.repeatCount ??
          1
        ),

      repeatEnd:
        Boolean(
          data?.repeatEnd
        )
    });
  }
}

async function handleBinaryMessage(
  message
) {
  try {
    const decoded =
      await decodeFrame(
        message.base64
      );

    const messages =
      decoded
        ?.protoMessageFetchResult
        ?.messages ??
      [];

    for (const item of messages) {
      const type =
        item?.decodedData?.type ??
        item?.type ??
        item?.method ??
        "desconhecido";

      const data =
        item?.decodedData?.data;

      processDecodedMessage(
        type,
        data
      );
    }
  } catch (error) {
    console.error(
      "[LocalTikTok] Erro ao decodificar frame:",
      error
    );
  }
}

function scheduleReconnect() {
  if (
    manualDisconnect ||
    liveSocketOpen ||
    !tiktokWindow ||
    tiktokWindow.isDestroyed()
  ) {
    return;
  }

  clearReconnectTimer();

  if (
    reconnectAttempt >=
    MAX_RECONNECT_ATTEMPTS
  ) {
    reconnecting = false;

    emitEvent(
      "reconnect_failed",
      {
        username:
          activeUsername
      }
    );

    return;
  }

  reconnectAttempt += 1;

  emitEvent(
    "reconnecting",
    {
      attempt:
        reconnectAttempt,

      maxAttempts:
        MAX_RECONNECT_ATTEMPTS
    }
  );

  const delay =
    Math.min(
      BASE_RECONNECT_DELAY *
        reconnectAttempt,
      10000
    );

  reconnectTimer =
    setTimeout(
      async () => {
        reconnectTimer = null;

        if (
          manualDisconnect ||
          liveSocketOpen ||
          !tiktokWindow ||
          tiktokWindow.isDestroyed()
        ) {
          return;
        }

        try {
          const liveUrl =
            getLiveUrl();

          if (!liveUrl) {
            throw new Error(
              "Usuário da live não disponível."
            );
          }

          console.log(
            `[LocalTikTok] Tentativa de reconexão ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS}`
          );

          await tiktokWindow.loadURL(
            liveUrl
          );

          if (!liveSocketOpen) {
            scheduleReconnect();
          }
        } catch (error) {
          console.error(
            "[LocalTikTok] Erro na reconexão:",
            error
          );

          emitEvent(
            "reconnect_error",
            {
              message:
                error?.message ??
                String(error),

              attempt:
                reconnectAttempt
            }
          );

          scheduleReconnect();
        }
      },
      delay
    );
}

function handleSocketOpen() {
  liveSocketOpen = true;

  clearReconnectTimer();
  resolveInitialConnection();

  console.log(
    "[LocalTikTok] WebSocket conectado."
  );

  if (reconnecting) {
    reconnecting = false;
    reconnectAttempt = 0;

    emitEvent(
      "reconnected",
      {
        username:
          activeUsername
      }
    );
  }
}

function handleSocketClose(message) {
  if (manualDisconnect) {
    return;
  }

  const wasOpen =
    liveSocketOpen;

  liveSocketOpen = false;

  console.log(
    "[LocalTikTok] WebSocket fechado.",
    message?.code ?? "",
    message?.reason ?? ""
  );

  if (!reconnecting) {
    reconnecting = true;

    emitEvent(
      "connection_lost",
      {
        username:
          activeUsername,

        code:
          message?.code,

        reason:
          message?.reason ?? ""
      }
    );
  }

  if (
    wasOpen ||
    reconnecting
  ) {
    scheduleReconnect();
  }
}

function registerWebSocketListener() {
  if (websocketListenerRegistered) {
    return;
  }

  websocketListenerRegistered = true;

  ipcMain.on(
    "tiktok-browser:websocket",
    async (event, message) => {
      if (
        !tiktokWindow ||
        tiktokWindow.isDestroyed()
      ) {
        return;
      }

      if (
        event.sender.id !==
        tiktokWindow.webContents.id
      ) {
        return;
      }

      if (
        !isLiveWebSocket(
          message?.url
        )
      ) {
        return;
      }

      if (
        message?.kind ===
        "created"
      ) {
        console.log(
          "[LocalTikTok] WebSocket detectado."
        );

        return;
      }

      if (
        message?.kind ===
        "open"
      ) {
        handleSocketOpen();
        return;
      }

      if (
        message?.kind ===
        "close"
      ) {
        handleSocketClose(
          message
        );

        return;
      }

      if (
        message?.kind ===
        "error"
      ) {
        console.error(
          "[LocalTikTok] Erro no WebSocket."
        );

        emitEvent(
          "error",
          {
            message:
              "Erro no WebSocket da TikTok Live."
          }
        );

        return;
      }

      if (
        message?.kind ===
        "binary-message"
      ) {
        await handleBinaryMessage(
          message
        );
      }
    }
  );
}

async function connectLocalTikTok(
  username,
  onEvent
) {
  const normalizedUsername =
    normalizeUsername(username);

  if (!normalizedUsername) {
    throw new Error(
      "Informe um usuário do TikTok."
    );
  }

  manualDisconnect = true;

  clearReconnectTimer();

  if (
    tiktokWindow &&
    !tiktokWindow.isDestroyed()
  ) {
    tiktokWindow.destroy();
  }

  tiktokWindow = null;

  activeUsername =
    normalizedUsername;

  currentOnEvent =
    onEvent;

  liveSocketOpen = false;
  reconnecting = false;
  reconnectAttempt = 0;
  manualDisconnect = false;

  registerWebSocketListener();

  tiktokWindow =
    new BrowserWindow({
      width: 1200,
      height: 850,

      show: false,

      backgroundColor:
        "#ffffff",

      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,

        partition:
          "persist:tiktok-live",

        preload: path.join(
          __dirname,
          "..",
          "tiktok-browser-preload.cjs"
        )
      }
    });

  const liveUrl =
    getLiveUrl();

  tiktokWindow.webContents.on(
    "did-finish-load",
    () => {
      console.log(
        "[LocalTikTok] Página carregada:",
        tiktokWindow?.webContents.getURL()
      );
    }
  );

  tiktokWindow.webContents.on(
    "did-fail-load",
    (
      _event,
      errorCode,
      errorDescription
    ) => {
      if (manualDisconnect) {
        return;
      }

      console.error(
        "[LocalTikTok] Falha ao carregar:",
        errorCode,
        errorDescription
      );

      emitEvent(
        "error",
        {
          message:
            `Falha ao abrir TikTok: ${errorDescription}`
        }
      );
    }
  );

  tiktokWindow.on(
    "closed",
    () => {
      const wasManual =
        manualDisconnect;

      clearReconnectTimer();

      tiktokWindow = null;
      liveSocketOpen = false;
      reconnecting = false;
      reconnectAttempt = 0;

      if (!wasManual) {
        emitEvent(
          "disconnected",
          {}
        );
      }
    }
  );

  await tiktokWindow.loadURL(
    liveUrl
  );

  try {
    await waitForInitialConnection();
  } catch (error) {
    manualDisconnect = true;

    clearInitialConnectionWait();
    clearReconnectTimer();

    currentOnEvent = null;
    activeUsername = null;

    liveSocketOpen = false;
    reconnecting = false;
    reconnectAttempt = 0;

    if (
      tiktokWindow &&
      !tiktokWindow.isDestroyed()
    ) {
      tiktokWindow.destroy();
    }

    tiktokWindow = null;

    throw error;
  }

  return {
    username:
      normalizedUsername,

    mode:
      "local-browser"
  };
}

function disconnectLocalTikTok() {
  manualDisconnect = true;

  clearReconnectTimer();

  currentOnEvent = null;
  activeUsername = null;

  liveSocketOpen = false;
  reconnecting = false;
  reconnectAttempt = 0;

  if (
    tiktokWindow &&
    !tiktokWindow.isDestroyed()
  ) {
    tiktokWindow.destroy();
  }

  tiktokWindow = null;
}

function openTikTokAccountWindow() {
  if (
    accountWindow &&
    !accountWindow.isDestroyed()
  ) {
    accountWindow.show();
    accountWindow.focus();

    return {
      success: true
    };
  }

  accountWindow =
    new BrowserWindow({
      width: 1100,
      height: 800,
      minWidth: 900,
      minHeight: 650,

      show: true,

      backgroundColor:
        "#ffffff",

      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,

        partition:
          "persist:tiktok-live"
      }
    });

  const chromeVersion =
    process.versions.chrome;

  accountWindow.webContents.setUserAgent(
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
  );
  accountWindow.on(
    "closed",
    () => {
      accountWindow = null;
    }
  );

  accountWindow.loadURL(
    "https://www.tiktok.com/login"
  );

  return {
    success: true
  };
}

async function getTikTokSessionStatus() {
  try {
    const tiktokSession =
      session.fromPartition(
        "persist:tiktok-live"
      );

    const cookies =
      await tiktokSession.cookies.get({
        url: "https://www.tiktok.com"
      });

    const authCookieNames =
      new Set([
        "sessionid",
        "sessionid_ss",
        "sid_tt",
        "sid_guard"
      ]);

    const authenticated =
      cookies.some(
        (cookie) =>
          authCookieNames.has(cookie.name) &&
          Boolean(cookie.value)
      );

    return {
      success: true,
      authenticated
    };
  } catch (error) {
    console.error(
      "[LocalTikTok] Erro ao verificar sessão:",
      error
    );

    return {
      success: false,
      authenticated: false,
      error:
        error?.message ??
        String(error)
    };
  }
}
module.exports = {
  connectLocalTikTok,
  disconnectLocalTikTok,
  openTikTokAccountWindow,
  getTikTokSessionStatus
};









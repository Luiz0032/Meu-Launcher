const {
  BrowserWindow,
  ipcMain
} = require("electron");

const path = require("path");

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 2000;

let tiktokWindow = null;
let currentOnEvent = null;
let websocketListenerRegistered = false;

let activeUsername = null;
let liveSocketOpen = false;
let reconnecting = false;
let reconnectAttempt = 0;
let reconnectTimer = null;
let manualDisconnect = false;

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

      show: true,

      backgroundColor:
        "#ffffff",

      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,

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

module.exports = {
  connectLocalTikTok,
  disconnectLocalTikTok
};

const {
  BrowserWindow,
  ipcMain
} = require("electron");

const path = require("path");

let tiktokWindow = null;
let currentOnEvent = null;
let websocketListenerRegistered = false;

const connectorPromise =
  import("tiktok-live-connector");

function normalizeUsername(username) {
  return String(username ?? "")
    .trim()
    .replace(/^@/, "");
}

function emitEvent(type, data) {
  if (typeof currentOnEvent === "function") {
    currentOnEvent(type, data);
  }
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

  currentOnEvent = onEvent;

  registerWebSocketListener();

  if (
    tiktokWindow &&
    !tiktokWindow.isDestroyed()
  ) {
    tiktokWindow.destroy();
    tiktokWindow = null;
  }

  tiktokWindow =
    new BrowserWindow({
      width: 1200,
      height: 850,

      // Por enquanto deixamos visível
      // para validar a integração.
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
    `https://www.tiktok.com/@${normalizedUsername}/live`;

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
      console.error(
        "[LocalTikTok] Falha ao carregar:",
        errorCode,
        errorDescription
      );

      emitEvent("error", {
        message:
          `Falha ao abrir TikTok: ${errorDescription}`
      });
    }
  );

  tiktokWindow.on(
    "closed",
    () => {
      tiktokWindow = null;

      emitEvent(
        "disconnected",
        {}
      );
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
  currentOnEvent = null;

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

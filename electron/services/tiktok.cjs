let connection = null;

let currentUsername = null;
let currentOnEvent = null;

let manuallyDisconnected = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let ignoreNextDisconnect = false;

const MAX_RECONNECT_ATTEMPTS = 5;

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

async function createConnection(username, onEvent) {
  const {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent
  } = await import("tiktok-live-connector");

  const liveConnection = new TikTokLiveConnection(username, {
    processInitialData: false,
    enableExtendedGiftInfo: false
  });

  liveConnection.on(WebcastEvent.CHAT, (data) => {
    onEvent?.("chat", {
      username:
        data.user?.uniqueId ??
        data.uniqueId ??
        "desconhecido",

      comment: data.comment ?? ""
    });
  });

  liveConnection.on(WebcastEvent.GIFT, (data) => {
    onEvent?.("gift", {
      username:
        data.user?.uniqueId ??
        data.uniqueId ??
        "desconhecido",

      giftId: data.giftId,

      giftName:
        data.gift?.name ??
        data.giftName ??
        "Presente",

      repeatCount:
        data.repeatCount ?? 1
    });
  });

  liveConnection.on(WebcastEvent.LIKE, (data) => {
    onEvent?.("like", {
      username:
        data.user?.uniqueId ??
        data.uniqueId ??
        "desconhecido",

      likeCount:
        data.likeCount ?? 0,

      totalLikeCount:
        data.totalLikeCount ?? 0
    });
  });

  liveConnection.on(ControlEvent.DISCONNECTED, () => {
    if (ignoreNextDisconnect) {
      ignoreNextDisconnect = false;
      return;
    }

    if (manuallyDisconnected) {
      return;
    }

    onEvent?.("connection_lost", {});

    scheduleReconnect();
  });

  liveConnection.on(ControlEvent.ERROR, (error) => {
    onEvent?.("error", {
      message:
        error?.message ??
        String(error)
    });
  });

  return liveConnection;
}

async function startConnection({
  isReconnect = false
} = {}) {
  if (!currentUsername || !currentOnEvent) {
    throw new Error(
      "Não há dados de conexão disponíveis."
    );
  }

  connection = await createConnection(
    currentUsername,
    currentOnEvent
  );

  const state = await connection.connect();

  reconnectAttempts = 0;

  if (isReconnect) {
    currentOnEvent?.("reconnected", {
      username: currentUsername,
      roomId: state.roomId
    });
  }

  return {
    username: currentUsername,
    roomId: state.roomId
  };
}

function scheduleReconnect() {
  if (
    manuallyDisconnected ||
    reconnectTimer ||
    !currentUsername
  ) {
    return;
  }

  if (
    reconnectAttempts >=
    MAX_RECONNECT_ATTEMPTS
  ) {
    currentOnEvent?.("reconnect_failed", {
      attempts: reconnectAttempts
    });

    return;
  }

  reconnectAttempts += 1;

  const delay = Math.min(
    2000 * reconnectAttempts,
    10000
  );

  currentOnEvent?.("reconnecting", {
    attempt: reconnectAttempts,
    maxAttempts:
      MAX_RECONNECT_ATTEMPTS,
    delay
  });

  reconnectTimer = setTimeout(
    async () => {
      reconnectTimer = null;

      try {
        if (connection) {
          try {
            ignoreNextDisconnect = true;
            connection.disconnect();
          } catch {
            ignoreNextDisconnect = false;
          }
        }

        connection = null;

        await startConnection({
          isReconnect: true
        });
      } catch (error) {
        currentOnEvent?.("reconnect_error", {
          attempt: reconnectAttempts,
          message:
            error?.message ??
            String(error)
        });

        scheduleReconnect();
      }
    },
    delay
  );
}

async function connectTikTok(
  username,
  onEvent
) {
  const normalizedUsername =
    username
      .trim()
      .replace(/^@/, "");

  if (!normalizedUsername) {
    throw new Error(
      "Informe um usuário do TikTok."
    );
  }

  manuallyDisconnected = true;

  clearReconnectTimer();

  if (connection) {
    try {
      connection.disconnect();
    } catch {
      // ignora erro de limpeza
    }
  }

  connection = null;

  currentUsername =
    normalizedUsername;

  currentOnEvent =
    onEvent;

  reconnectAttempts = 0;

  manuallyDisconnected = false;

  return await startConnection();
}


function disconnectTikTok() {
  manuallyDisconnected = true;

  clearReconnectTimer();

  reconnectAttempts = 0;

  if (connection) {
    try {
      connection.disconnect();
    } catch {
      // ignora erro de limpeza
    }

    connection = null;
  }

  currentUsername = null;
  currentOnEvent = null;
}

module.exports = {
  connectTikTok,
  disconnectTikTok
};




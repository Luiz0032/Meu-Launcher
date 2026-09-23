let connection = null;

async function connectTikTok(username, onEvent) {
  const normalizedUsername = username.trim().replace(/^@/, "");

  if (!normalizedUsername) {
    throw new Error("Informe um usuário do TikTok.");
  }

  if (connection) {
    connection.disconnect();
    connection = null;
  }

  const {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent
  } = await import("tiktok-live-connector");

connection = new TikTokLiveConnection(normalizedUsername, {
  processInitialData: false,
  enableExtendedGiftInfo: true,
  connectWithUniqueId: true
});

  connection.on(WebcastEvent.CHAT, (data) => {
    onEvent?.("chat", {
      username: data.user?.uniqueId ?? data.uniqueId ?? "desconhecido",
      comment: data.comment ?? ""
    });
  });

  connection.on(WebcastEvent.GIFT, (data) => {
    onEvent?.("gift", {
      username: data.user?.uniqueId ?? data.uniqueId ?? "desconhecido",
      giftId: data.giftId,
      giftName: data.gift?.name ?? "Presente",
      repeatCount: data.repeatCount ?? 1
    });
  });

  connection.on(WebcastEvent.LIKE, (data) => {
    onEvent?.("like", {
      username: data.user?.uniqueId ?? data.uniqueId ?? "desconhecido",
      likeCount: data.likeCount ?? 0,
      totalLikeCount: data.totalLikeCount ?? 0
    });
  });

  connection.on(ControlEvent.DISCONNECTED, () => {
    onEvent?.("disconnected", {});
  });

  connection.on(ControlEvent.ERROR, (error) => {
    onEvent?.("error", {
      message: error?.message ?? String(error)
    });
  });

  const state = await connection.connect();

  return {
    username: normalizedUsername,
    roomId: state.roomId
  };
}

function disconnectTikTok() {
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}

module.exports = {
  connectTikTok,
  disconnectTikTok
};

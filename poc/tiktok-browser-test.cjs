const {
  app,
  BrowserWindow,
  ipcMain
} = require("electron");

const path = require("path");

const username = process.argv[2]
  ?.trim()
  .replace(/^@/, "");

if (!username) {
  console.error("Informe o usuário da live.");
  process.exit(1);
}

const connectorPromise =
  import("tiktok-live-connector");

let win;

function printDecodedMessage(type, data) {
  if (type === "WebcastChatMessage") {
    console.log("");
    console.log("[CHAT]");
    console.log(
      "Usuário:",
      data?.user?.uniqueId ?? "desconhecido"
    );
    console.log(
      "Mensagem:",
      data?.comment ?? ""
    );

    return;
  }

  if (type === "WebcastLikeMessage") {
    console.log("");
    console.log("[LIKE]");
    console.log(
      "Usuário:",
      data?.user?.uniqueId ?? "desconhecido"
    );
    console.log(
      "Quantidade:",
      data?.count ?? 0
    );
    console.log(
      "Total:",
      data?.total ?? 0
    );

    return;
  }

  if (type === "WebcastGiftMessage") {
    console.log("");
    console.log("[GIFT]");
    console.log(
      "Usuário:",
      data?.user?.uniqueId ?? "desconhecido"
    );
    console.log(
      "Gift ID:",
      String(data?.giftId ?? "")
    );
    console.log(
      "Presente:",
      data?.giftDetails?.giftName ??
        data?.gift?.name ??
        "nome não disponível"
    );
    console.log(
      "Quantidade:",
      data?.repeatCount ?? 1
    );
    console.log(
      "Combo finalizado:",
      data?.repeatEnd ?? false
    );
  }
}

ipcMain.on(
  "poc:websocket",
  async (_event, message) => {
    if (message.kind === "created") {
      try {
        const parsed = new URL(message.url);

        console.log("");
        console.log("[WEBSOCKET CRIADO]");
        console.log(
          "Destino:",
          `${parsed.hostname}${parsed.pathname}`
        );
      } catch {
        console.log("");
        console.log("[WEBSOCKET CRIADO]");
      }

      return;
    }

    if (message.kind !== "binary-message") {
      return;
    }

    try {
      const {
        deserializeWebSocketMessage
      } = await connectorPromise;

      const buffer = Buffer.from(
        message.base64,
        "base64"
      );

      const decoded =
        await deserializeWebSocketMessage(
          new Uint8Array(buffer)
        );

      const messages =
        decoded
          ?.protoMessageFetchResult
          ?.messages ?? [];

      for (const item of messages) {
        const type =
          item?.decodedData?.type ??
          item?.type ??
          item?.method ??
          "desconhecido";

        const data =
          item?.decodedData?.data;

        if (
          type === "WebcastChatMessage" ||
          type === "WebcastLikeMessage" ||
          type === "WebcastGiftMessage"
        ) {
          printDecodedMessage(
            type,
            data
          );
        }
      }
    } catch (error) {
      console.log("");
      console.error(
        "[ERRO AO DECODIFICAR FRAME]"
      );

      console.error(
        error?.message ?? error
      );
    }
  }
);

app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1200,
    height: 850,
    show: true,
    backgroundColor: "#ffffff",

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,

      partition:
        "persist:tiktok-live",

      preload: path.join(
        __dirname,
        "tiktok-preload.cjs"
      )
    }
  });

  win.webContents.on(
    "preload-error",
    (_event, preloadPath, error) => {
      console.error(
        "[ERRO NO PRELOAD]",
        preloadPath,
        error
      );
    }
  );

  win.webContents.on(
    "did-finish-load",
    () => {
      console.log("");
      console.log("[PÁGINA CARREGADA]");
      console.log(
        "URL:",
        win.webContents.getURL()
      );
    }
  );

  const liveUrl =
    `https://www.tiktok.com/@${username}/live`;

  console.log("");
  console.log("[ABRINDO LIVE]");
  console.log(liveUrl);

  await win.loadURL(liveUrl);
});

app.on("window-all-closed", () => {
  app.quit();
});

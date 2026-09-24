const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const {
  connectTikTok,
  disconnectTikTok
} = require("./services/tiktok.cjs");

const {
  connectLocalTikTok,
  disconnectLocalTikTok,
  openTikTokAccountWindow
} = require("./services/local-tiktok.cjs");

const {
  processEvent,
  clearRules
} = require("./services/action-engine.cjs");

const {
  setupDefaultRules
} = require("./services/default-rules.cjs");

const {
  loadPreset,
  savePreset
} = require("./services/preset-loader.cjs");

let mainWindow = null;
let gameWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(
      path.join(__dirname, "..", "dist", "index.html")
    );
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createGameWindow() {
  if (gameWindow && !gameWindow.isDestroyed()) {
    gameWindow.focus();
    return;
  }

  gameWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: "Avatar Runner",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (app.isPackaged) {
    gameWindow.loadFile(
      path.join(__dirname, "..", "dist", "game.html")
    );
  } else {
    gameWindow.loadURL("http://localhost:5173/game.html");
  }

  gameWindow.on("closed", () => {
    gameWindow = null;
  });
}

function sendToWindow(window, channel, ...args) {
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, ...args);
  }
}

function emitGameAction(action) {
  sendToWindow(mainWindow, "game:action", action);
  sendToWindow(gameWindow, "game:action", action);

  console.log("[GameAction]", action);
}

function configureActionEngine() {
  clearRules();
  setupDefaultRules();
}


ipcMain.handle("game:open", async () => {
  try {
    createGameWindow();

    return {
      success: true
    };
  } catch (error) {
    console.error("Erro ao abrir jogo:", error);

    return {
      success: false,
      error: error?.message ?? String(error)
    };
  }
});

ipcMain.handle("preset:get", async () => {
  try {
    return {
      success: true,
      preset: loadPreset()
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message ?? String(error)
    };
  }
});

ipcMain.handle("preset:save", async (_event, preset) => {
  const result = savePreset(preset);

  if (result.success) {
    configureActionEngine();
  }

  return result;
});

ipcMain.handle("tiktok:connect", async (_event, username) => {
  try {
    configureActionEngine();

    const result = await connectTikTok(username, async (type, data) => {
      sendToWindow(mainWindow, "tiktok:event", type, data);

      await processEvent(type, data, {
        emitGameAction
      });
    });

    return {
      success: true,
      username: result.username,
      roomId: result.roomId
    };
  } catch (error) {
    console.error("Erro ao conectar ao TikTok:", error);

    return {
      success: false,
      error: error?.message ?? String(error)
    };
  }
});

ipcMain.handle("tiktok:disconnect", async () => {
  try {
    disconnectTikTok();

    return {
      success: true
    };
  } catch (error) {
    console.error("Erro ao desconectar do TikTok:", error);

    return {
      success: false,
      error: error?.message ?? String(error)
    };
  }
});







ipcMain.handle("tiktok:open-account", async () => {
  try {
    return openTikTokAccountWindow();
  } catch (error) {
    console.error(
      "[LocalTikTok] Erro ao abrir conta TikTok:",
      error
    );

    return {
      success: false,
      error: error?.message ?? String(error)
    };
  }
});
ipcMain.handle("tiktok:connect-local", async (_event, username) => {
  try {
    configureActionEngine();

    const result = await connectLocalTikTok(
      username,
      async (type, data) => {
        sendToWindow(
          mainWindow,
          "tiktok:event",
          type,
          data
        );

        await processEvent(type, data, {
          emitGameAction
        });
      }
    );

    return {
      success: true,
      username: result.username,
      mode: result.mode
    };
  } catch (error) {
    console.error(
      "[LocalTikTok] Erro ao conectar:",
      error
    );

    return {
      success: false,
      error: error?.message ?? String(error)
    };
  }
});

ipcMain.handle("tiktok:disconnect-local", async () => {
  try {
    disconnectLocalTikTok();

    return {
      success: true
    };
  } catch (error) {
    console.error(
      "[LocalTikTok] Erro ao desconectar:",
      error
    );

    return {
      success: false,
      error: error?.message ?? String(error)
    };
  }
});

app.whenReady().then(() => {
  configureActionEngine();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  disconnectTikTok();
  disconnectLocalTikTok();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});




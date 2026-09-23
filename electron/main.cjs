const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const {
  connectTikTok,
  disconnectTikTok
} = require("./services/tiktok.cjs");

let mainWindow = null;

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

  mainWindow.loadURL("http://localhost:5173");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("tiktok:connect", async (_event, username) => {
  try {
    const result = await connectTikTok(username, (type, data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("tiktok:event", type, data);
      }
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

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  disconnectTikTok();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

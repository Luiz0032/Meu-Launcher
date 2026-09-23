const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("liveAPI", {
  connectTikTok: (username) => {
    return ipcRenderer.invoke("tiktok:connect", username);
  },

  disconnectTikTok: () => {
    return ipcRenderer.invoke("tiktok:disconnect");
  },

  openGame: () => {
    return ipcRenderer.invoke("game:open");
  },

  getPreset: () => {
    return ipcRenderer.invoke("preset:get");
  },

  savePreset: (preset) => {
    return ipcRenderer.invoke("preset:save", preset);
  },

  onTikTokEvent: (callback) => {
    const listener = (_event, type, data) => {
      callback(type, data);
    };

    ipcRenderer.on("tiktok:event", listener);

    return () => {
      ipcRenderer.removeListener("tiktok:event", listener);
    };
  },

  onGameAction: (callback) => {
    const listener = (_event, action) => {
      callback(action);
    };

    ipcRenderer.on("game:action", listener);

    return () => {
      ipcRenderer.removeListener("game:action", listener);
    };
  }
});

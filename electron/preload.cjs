const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("liveAPI", {
  connectTikTok: (username) => {
    return ipcRenderer.invoke("tiktok:connect", username);
  },

  disconnectTikTok: () => {
    return ipcRenderer.invoke("tiktok:disconnect");
  },

  connectLocalTikTok: (username) => {
    return ipcRenderer.invoke("tiktok:connect-local", username);
  },

  disconnectLocalTikTok: () => {
    return ipcRenderer.invoke("tiktok:disconnect-local");
  },

  openTikTokAccount: () => {
    return ipcRenderer.invoke("tiktok:open-account");
  },

  getTikTokSessionStatus: () => {
    return ipcRenderer.invoke("tiktok:session-status");
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



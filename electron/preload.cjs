const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("liveAPI", {
  connectTikTok: (username) => {
    return ipcRenderer.invoke("tiktok:connect", username);
  },

  disconnectTikTok: () => {
    return ipcRenderer.invoke("tiktok:disconnect");
  },

  onTikTokEvent: (callback) => {
    const listener = (_event, type, data) => {
      callback(type, data);
    };

    ipcRenderer.on("tiktok:event", listener);

    return () => {
      ipcRenderer.removeListener("tiktok:event", listener);
    };
  }
});

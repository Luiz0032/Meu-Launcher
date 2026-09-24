const {
  contextBridge,
  ipcRenderer
} = require("electron");

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }

  const data = event.data;

  if (
    !data ||
    data.__LIVE_LAUNCHER_POC__ !== true
  ) {
    return;
  }

  ipcRenderer.send(
    "poc:websocket",
    data
  );
});

contextBridge.executeInMainWorld({
  func: () => {
    if (window.__LIVE_LAUNCHER_WS_PATCHED__) {
      return;
    }

    Object.defineProperty(
      window,
      "__LIVE_LAUNCHER_WS_PATCHED__",
      {
        value: true
      }
    );

    function arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);

      let binary = "";

      const chunkSize = 0x8000;

      for (
        let offset = 0;
        offset < bytes.length;
        offset += chunkSize
      ) {
        const chunk = bytes.subarray(
          offset,
          Math.min(
            offset + chunkSize,
            bytes.length
          )
        );

        binary += String.fromCharCode(
          ...chunk
        );
      }

      return btoa(binary);
    }

    const NativeWebSocket =
      window.WebSocket;

    window.WebSocket = new Proxy(
      NativeWebSocket,
      {
        construct(target, args) {
          const socket =
            Reflect.construct(
              target,
              args,
              target
            );

          window.postMessage(
            {
              __LIVE_LAUNCHER_POC__: true,
              kind: "created",
              url: String(args[0] ?? "")
            },
            "*"
          );

          socket.addEventListener(
            "message",
            async (event) => {
              if (
                event.data instanceof
                ArrayBuffer
              ) {
                window.postMessage(
                  {
                    __LIVE_LAUNCHER_POC__: true,
                    kind: "binary-message",
                    url: socket.url,
                    size:
                      event.data.byteLength,
                    base64:
                      arrayBufferToBase64(
                        event.data
                      )
                  },
                  "*"
                );

                return;
              }

              if (
                event.data instanceof Blob
              ) {
                const buffer =
                  await event.data.arrayBuffer();

                window.postMessage(
                  {
                    __LIVE_LAUNCHER_POC__: true,
                    kind: "binary-message",
                    url: socket.url,
                    size:
                      buffer.byteLength,
                    base64:
                      arrayBufferToBase64(
                        buffer
                      )
                  },
                  "*"
                );

                return;
              }

              window.postMessage(
                {
                  __LIVE_LAUNCHER_POC__: true,
                  kind: "text-message",
                  url: socket.url,
                  text: String(
                    event.data ?? ""
                  ).slice(0, 500)
                },
                "*"
              );
            }
          );

          return socket;
        }
      }
    );
  }
});

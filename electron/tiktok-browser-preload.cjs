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
    data.__LIVE_LAUNCHER_TIKTOK__ !== true
  ) {
    return;
  }

  ipcRenderer.send(
    "tiktok-browser:websocket",
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

    function sendEvent(kind, data = {}) {
      window.postMessage(
        {
          __LIVE_LAUNCHER_TIKTOK__: true,
          kind,
          ...data
        },
        "*"
      );
    }

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
          const socket = Reflect.construct(
            target,
            args,
            target
          );

          const initialUrl =
            String(args[0] ?? "");

          sendEvent("created", {
            url: initialUrl
          });

          socket.addEventListener(
            "open",
            () => {
              sendEvent("open", {
                url:
                  socket.url ||
                  initialUrl
              });
            }
          );

          socket.addEventListener(
            "close",
            (event) => {
              sendEvent("close", {
                url:
                  socket.url ||
                  initialUrl,

                code:
                  event.code,

                reason:
                  event.reason ?? "",

                wasClean:
                  event.wasClean
              });
            }
          );

          socket.addEventListener(
            "error",
            () => {
              sendEvent("error", {
                url:
                  socket.url ||
                  initialUrl
              });
            }
          );

          socket.addEventListener(
            "message",
            async (event) => {
              let buffer = null;

              if (
                event.data instanceof
                ArrayBuffer
              ) {
                buffer = event.data;
              }

              if (
                event.data instanceof Blob
              ) {
                buffer =
                  await event.data.arrayBuffer();
              }

              if (!buffer) {
                return;
              }

              sendEvent(
                "binary-message",
                {
                  url:
                    socket.url ||
                    initialUrl,

                  size:
                    buffer.byteLength,

                  base64:
                    arrayBufferToBase64(
                      buffer
                    )
                }
              );
            }
          );

          return socket;
        }
      }
    );
  }
});

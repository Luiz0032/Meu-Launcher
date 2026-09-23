const fs = require("fs");
const path = require("path");

const DEFAULT_PRESET_PATH = path.join(
  __dirname,
  "..",
  "config",
  "default-preset.json"
);

function loadPreset() {
  try {
    const content = fs.readFileSync(DEFAULT_PRESET_PATH, "utf8");

    return JSON.parse(content);
  } catch (error) {
    console.error("[Preset] Erro ao carregar preset:", error);

    return {
      like: {
        action: "jump"
      },
      chat: {
        action: "showMessage"
      },
      gifts: {
        default: {
          action: "giftReaction"
        }
      }
    };
  }
}

module.exports = {
  loadPreset
};

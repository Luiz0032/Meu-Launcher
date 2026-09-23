const fs = require("fs");
const path = require("path");

const DEFAULT_PRESET_PATH = path.join(
  __dirname,
  "..",
  "config",
  "default-preset.json"
);

const FALLBACK_PRESET = {
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

function loadPreset() {
  try {
    const content = fs.readFileSync(DEFAULT_PRESET_PATH, "utf8");

    return JSON.parse(content);
  } catch (error) {
    console.error("[Preset] Erro ao carregar preset:", error);

    return FALLBACK_PRESET;
  }
}

function savePreset(preset) {
  try {
    const content = JSON.stringify(preset, null, 2);

    fs.writeFileSync(
      DEFAULT_PRESET_PATH,
      content,
      "utf8"
    );

    console.log("[Preset] Configuração salva.");

    return {
      success: true
    };
  } catch (error) {
    console.error("[Preset] Erro ao salvar preset:", error);

    return {
      success: false,
      error: error?.message ?? String(error)
    };
  }
}

module.exports = {
  loadPreset,
  savePreset
};

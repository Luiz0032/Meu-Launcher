const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const BUNDLED_PRESET_PATH = path.join(
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

function getUserPresetPath() {
  return path.join(
    app.getPath("userData"),
    "preset.json"
  );
}

function ensureUserPreset() {
  const userPresetPath = getUserPresetPath();

  if (fs.existsSync(userPresetPath)) {
    return userPresetPath;
  }

  fs.mkdirSync(
    path.dirname(userPresetPath),
    {
      recursive: true
    }
  );

  if (fs.existsSync(BUNDLED_PRESET_PATH)) {
    fs.copyFileSync(
      BUNDLED_PRESET_PATH,
      userPresetPath
    );
  } else {
    fs.writeFileSync(
      userPresetPath,
      JSON.stringify(FALLBACK_PRESET, null, 2),
      "utf8"
    );
  }

  return userPresetPath;
}

function loadPreset() {
  try {
    const userPresetPath = ensureUserPreset();

    const content = fs.readFileSync(
      userPresetPath,
      "utf8"
    );

    return JSON.parse(content);
  } catch (error) {
    console.error(
      "[Preset] Erro ao carregar preset:",
      error
    );

    return FALLBACK_PRESET;
  }
}

function savePreset(preset) {
  try {
    const userPresetPath = ensureUserPreset();

    fs.writeFileSync(
      userPresetPath,
      JSON.stringify(preset, null, 2),
      "utf8"
    );

    console.log(
      `[Preset] Configuração salva em: ${userPresetPath}`
    );

    return {
      success: true
    };
  } catch (error) {
    console.error(
      "[Preset] Erro ao salvar preset:",
      error
    );

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

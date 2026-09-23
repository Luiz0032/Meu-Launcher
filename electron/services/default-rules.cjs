const { registerRule } = require("./action-engine.cjs");
const { loadPreset } = require("./preset-loader.cjs");

function setupDefaultRules() {
  const preset = loadPreset();

  registerRule({
    name: "Like recebido",
    eventType: "like",
    action: async (data, context) => {
      context.emitGameAction?.({
        type: "like",
        action: preset.like?.action ?? "jump",
        username: data.username,
        amount: data.likeCount ?? 0
      });
    }
  });

  registerRule({
    name: "Comentário recebido",
    eventType: "chat",
    action: async (data, context) => {
      context.emitGameAction?.({
        type: "chat",
        action: preset.chat?.action ?? "showMessage",
        username: data.username,
        message: data.comment ?? ""
      });
    }
  });

  registerRule({
    name: "Presente recebido",
    eventType: "gift",
    action: async (data, context) => {
      const giftName = data.giftName ?? "Presente";

      const giftPreset =
        preset.gifts?.[giftName] ??
        preset.gifts?.default ?? {
          action: "giftReaction"
        };

      context.emitGameAction?.({
        type: "gift",
        action: giftPreset.action,
        username: data.username,
        giftId: data.giftId,
        giftName,
        amount: data.repeatCount ?? 1
      });
    }
  });
}

module.exports = {
  setupDefaultRules
};

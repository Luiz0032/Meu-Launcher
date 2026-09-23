const { registerRule } = require("./action-engine.cjs");

function setupDefaultRules() {
  registerRule({
    name: "Like recebido",
    eventType: "like",
    action: async (data, context) => {
      context.emitGameAction?.({
        type: "like",
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
        username: data.username,
        message: data.comment ?? ""
      });
    }
  });

  registerRule({
    name: "Presente recebido",
    eventType: "gift",
    action: async (data, context) => {
      context.emitGameAction?.({
        type: "gift",
        username: data.username,
        giftId: data.giftId,
        giftName: data.giftName,
        amount: data.repeatCount ?? 1
      });
    }
  });
}

module.exports = {
  setupDefaultRules
};

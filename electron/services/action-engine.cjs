const rules = [];

function registerRule(rule) {
  rules.push(rule);
}

function clearRules() {
  rules.length = 0;
}

async function processEvent(type, data, context = {}) {
  const matchingRules = rules.filter((rule) => {
    if (rule.eventType !== type) {
      return false;
    }

    if (typeof rule.condition === "function") {
      return rule.condition(data);
    }

    return true;
  });

  for (const rule of matchingRules) {
    try {
      await rule.action(data, context);
    } catch (error) {
      console.error(
        `[ActionEngine] Erro na regra "${rule.name}":`,
        error
      );
    }
  }
}

function getRules() {
  return [...rules];
}

module.exports = {
  registerRule,
  clearRules,
  processEvent,
  getRules
};

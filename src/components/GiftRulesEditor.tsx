import { useState } from "react";
import type { PresetAction } from "../types/preset";

type GiftRules = {
  [giftName: string]: {
    action: PresetAction;
  };
};

type GiftRulesEditorProps = {
  gifts: GiftRules;
  onChange: (gifts: GiftRules) => void;
};

const actions: {
  value: PresetAction;
  label: string;
}[] = [
  {
    value: "jump",
    label: "Pular"
  },
  {
    value: "danceShort",
    label: "Dança curta"
  },
  {
    value: "danceSpecial",
    label: "Dança especial"
  },
  {
    value: "giftReaction",
    label: "Reação"
  }
];

function GiftRulesEditor({
  gifts,
  onChange
}: GiftRulesEditorProps) {
  const [newGiftName, setNewGiftName] = useState("");
  const [newGiftAction, setNewGiftAction] =
    useState<PresetAction>("giftReaction");

  const giftEntries = Object.entries(gifts).filter(
    ([giftName]) => giftName !== "default"
  );

  function addGift() {
    const giftName = newGiftName.trim();

    if (!giftName) {
      return;
    }

    if (giftName.toLowerCase() === "default") {
      return;
    }

    const alreadyExists = Object.keys(gifts).some(
      (name) =>
        name.toLowerCase() === giftName.toLowerCase()
    );

    if (alreadyExists) {
      return;
    }

    onChange({
      ...gifts,
      [giftName]: {
        action: newGiftAction
      }
    });

    setNewGiftName("");
    setNewGiftAction("giftReaction");
  }

  function updateGiftAction(
    giftName: string,
    action: PresetAction
  ) {
    onChange({
      ...gifts,
      [giftName]: {
        action
      }
    });
  }

  function removeGift(giftName: string) {
    const updatedGifts = {
      ...gifts
    };

    delete updatedGifts[giftName];

    onChange(updatedGifts);
  }

  return (
    <div className="gift-rules-editor">
      <div className="gift-rules-header">
        <div>
          <h4>Presentes personalizados</h4>
          <p>
            Adicione qualquer presente do TikTok e escolha
            qual ação ele deve executar.
          </p>
        </div>
      </div>

      <div className="gift-rules-list">
        {giftEntries.length === 0 ? (
          <div className="gift-rules-empty">
            Nenhum presente personalizado cadastrado.
          </div>
        ) : (
          giftEntries.map(([giftName, config]) => (
            <div
              className="gift-rule-row"
              key={giftName}
            >
              <div className="gift-rule-name">
                {giftName}
              </div>

              <select
                value={config.action}
                onChange={(event) =>
                  updateGiftAction(
                    giftName,
                    event.target.value as PresetAction
                  )
                }
              >
                {actions.map((action) => (
                  <option
                    key={action.value}
                    value={action.value}
                  >
                    {action.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="gift-remove-button"
                onClick={() => removeGift(giftName)}
              >
                Remover
              </button>
            </div>
          ))
        )}
      </div>

      <div className="gift-add-row">
        <input
          type="text"
          placeholder="Nome do presente"
          value={newGiftName}
          onChange={(event) =>
            setNewGiftName(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              addGift();
            }
          }}
        />

        <select
          value={newGiftAction}
          onChange={(event) =>
            setNewGiftAction(
              event.target.value as PresetAction
            )
          }
        >
          {actions.map((action) => (
            <option
              key={action.value}
              value={action.value}
            >
              {action.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="primary-button"
          onClick={addGift}
        >
          Adicionar presente
        </button>
      </div>
    </div>
  );
}

export default GiftRulesEditor;

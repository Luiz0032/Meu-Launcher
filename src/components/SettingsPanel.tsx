import type {
  PresetAction,
  PresetConfig
} from "../types/preset";

import GiftRulesEditor from "./GiftRulesEditor";

type SettingsPanelProps = {
  likeAction: PresetAction;
  chatAction: PresetAction;
  gifts: PresetConfig["gifts"];
  presetStatus: string;

  setLikeAction: (value: PresetAction) => void;
  setChatAction: (value: PresetAction) => void;
  setGifts: (value: PresetConfig["gifts"]) => void;

  onSave: () => void;
};

function SettingsPanel({
  likeAction,
  chatAction,
  gifts,
  presetStatus,
  setLikeAction,
  setChatAction,
  setGifts,
  onSave
}: SettingsPanelProps) {
  const defaultGiftAction =
    gifts.default?.action ?? "giftReaction";

  function updateDefaultGiftAction(
    action: PresetAction
  ) {
    setGifts({
      ...gifts,
      default: {
        action
      }
    });
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            CONFIGURAÇÕES
          </p>

          <h2>Preset de eventos</h2>
        </div>
      </header>

      <section className="settings-panel">
        <div className="settings-header">
          <h3>Ações da Live</h3>

          <p>
            Defina como cada evento deve afetar o jogo.
          </p>
        </div>

        <div className="settings-grid">
          <label className="setting-field">
            <span>Likes</span>

            <select
              value={likeAction}
              onChange={(event) =>
                setLikeAction(
                  event.target.value as PresetAction
                )
              }
            >
              <option value="jump">
                Pular
              </option>

              <option value="danceShort">
                Dança curta
              </option>

              <option value="danceSpecial">
                Dança especial
              </option>

              <option value="giftReaction">
                Reação
              </option>
            </select>
          </label>

          <label className="setting-field">
            <span>Comentários</span>

            <select
              value={chatAction}
              onChange={(event) =>
                setChatAction(
                  event.target.value as PresetAction
                )
              }
            >
              <option value="showMessage">
                Mostrar mensagem
              </option>

              <option value="jump">
                Pular
              </option>

              <option value="danceShort">
                Dança curta
              </option>

              <option value="danceSpecial">
                Dança especial
              </option>
            </select>
          </label>

          <label className="setting-field">
            <span>Outros presentes</span>

            <select
              value={defaultGiftAction}
              onChange={(event) =>
                updateDefaultGiftAction(
                  event.target.value as PresetAction
                )
              }
            >
              <option value="giftReaction">
                Reação padrão
              </option>

              <option value="danceShort">
                Dança curta
              </option>

              <option value="danceSpecial">
                Dança especial
              </option>

              <option value="jump">
                Pular
              </option>
            </select>
          </label>
        </div>

        <GiftRulesEditor
          gifts={gifts}
          onChange={setGifts}
        />

        <div className="settings-footer">
          <span className="preset-status">
            {presetStatus}
          </span>

          <button
            className="primary-button"
            onClick={onSave}
          >
            Salvar configurações
          </button>
        </div>
      </section>
    </>
  );
}

export default SettingsPanel;

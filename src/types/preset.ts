export type PresetAction =
  | "jump"
  | "showMessage"
  | "danceShort"
  | "danceSpecial"
  | "giftReaction";

export type PresetConfig = {
  like: {
    action: PresetAction;
  };

  chat: {
    action: PresetAction;
  };

  gifts: {
    [giftName: string]: {
      action: PresetAction;
    };
  };
};

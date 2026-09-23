import type { PresetConfig } from "./types/preset";

export {};

declare global {
  interface Window {
    liveAPI: {
      connectTikTok: (username: string) => Promise<{
        success: boolean;
        username?: string;
        roomId?: string;
        error?: string;
      }>;

      disconnectTikTok: () => Promise<{
        success: boolean;
        error?: string;
      }>;

      openGame: () => Promise<{
        success: boolean;
        error?: string;
      }>;

      getPreset: () => Promise<{
        success: boolean;
        preset?: PresetConfig;
        error?: string;
      }>;

      savePreset: (preset: PresetConfig) => Promise<{
        success: boolean;
        error?: string;
      }>;

      onTikTokEvent: (
        callback: (type: string, data: any) => void
      ) => () => void;

      onGameAction: (
        callback: (action: {
          type: string;
          action?: string;
          username?: string;
          amount?: number;
          message?: string;
          giftId?: number;
          giftName?: string;
        }) => void
      ) => () => void;
    };
  }
}

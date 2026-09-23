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

      onTikTokEvent: (
        callback: (type: string, data: any) => void
      ) => () => void;
    };
  }
}

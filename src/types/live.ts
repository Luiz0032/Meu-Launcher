export type LiveEvent = {
  id: number;
  type: string;
  username: string;
  description: string;
  time: string;
};

export type GameAction = {
  id: number;
  type: string;
  action?: string;
  username?: string;
  amount?: number;
  message?: string;
  giftId?: number;
  giftName?: string;
  time: string;
};

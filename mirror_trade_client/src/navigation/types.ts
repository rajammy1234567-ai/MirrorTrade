export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  TwoFA: undefined;
  ExchangeConnect: undefined;
  MainTabs: undefined;
  TraderDetail: { traderId: string };
  CopySetup: { traderId: string };
  CreateBot: { type?: "Grid" | "DCA" } | undefined;
  Signals: undefined;
  Notifications: undefined;
  BotDetail: { botId: string };
  Security: undefined;
  Language: undefined;
  TradingPrefs: undefined;
  Help: undefined;
  Referral: undefined;
  TeamRank: { focus?: "T-VIP" | "C-VIP" } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  Trade: undefined;
  Portfolio: undefined;
  Profile: undefined;
};

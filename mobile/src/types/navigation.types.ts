export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type BuyerTabParamList = {
  Home: undefined;
  OrderHistory: undefined;
  Profile: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  Store: { storeId: string };
  Cart: undefined;
  Checkout: { orderId: string };
  OrderConfirm: { orderId: string; code: string };
};

export type SellerTabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Products: undefined;
  StoreSettings: undefined;
};

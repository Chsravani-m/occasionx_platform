export type AuthStackParamList = {
  SignIn: undefined;
  ProviderRegister: undefined;
  ProviderSetup: { providerId: string; email: string; businessName: string };
};

export type ProviderTabParamList = {
  Dashboard: undefined;
  ProviderBookings: undefined;
  Earnings: undefined;
  BankDetails: undefined;
};

export type ProviderStackParamList = {
  ProviderTabs: undefined;
  Services: undefined;
  Pricing: { serviceId: string; serviceName: string };
  Specifications: {
    serviceId: string;
    serviceName: string;
    categoryName: string;
    attributes?: Record<string, unknown>;
  };
  Portfolio: undefined;
  Calendar: undefined;
  BookingPolicy: undefined;
  Notifications: undefined;
  Settings: undefined;
  Reviews: undefined;
};

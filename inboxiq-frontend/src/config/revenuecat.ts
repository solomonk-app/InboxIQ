import { Platform } from "react-native";
import Constants from "expo-constants";

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "",
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "",
};

export const ENTITLEMENT_ID = "pro";

// RevenueCat native module is not available in Expo Go
const isExpoGo = Constants.appOwnership === "expo";

export async function initRevenueCat(userId?: string) {
  if (isExpoGo) return;

  try {
    const Purchases = (await import("react-native-purchases")).default;
    const { LOG_LEVEL } = await import("react-native-purchases");
    const apiKey = Platform.OS === "ios" ? API_KEYS.ios : API_KEYS.android;

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({ apiKey });

    if (userId) {
      await Purchases.logIn(userId);
    }
  } catch (err) {
    console.warn("RevenueCat init failed:", err);
  }
}

export async function getPurchasesModule() {
  if (isExpoGo) return null;
  try {
    return (await import("react-native-purchases")).default;
  } catch {
    return null;
  }
}

export async function checkProEntitlement(): Promise<boolean> {
  const Purchases = await getPurchasesModule();
  if (!Purchases) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

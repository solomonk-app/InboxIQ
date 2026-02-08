import { create } from "zustand";
import { subscriptionAPI } from "../services/api";
import { ENTITLEMENT_ID, getPurchasesModule } from "../config/revenuecat";
import { SubscriptionTier } from "../types";

interface SubscriptionState {
  tier: SubscriptionTier;
  isPro: boolean;
  digestsToday: number;
  maxDigests: number;
  canSendEmail: boolean;
  canSchedule: boolean;
  loaded: boolean;
  currentOffering: any | null;
  purchasing: boolean;

  loadSubscription: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: "free",
  isPro: false,
  digestsToday: 0,
  maxDigests: 3,
  canSendEmail: false,
  canSchedule: false,
  loaded: false,
  currentOffering: null,
  purchasing: false,

  loadSubscription: async () => {
    try {
      const Purchases = await getPurchasesModule();
      let hasPro = false;

      // Check RevenueCat entitlements (only in production builds)
      if (Purchases) {
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          hasPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
        } catch {}
      }

      // If RevenueCat says pro, sync with backend
      if (hasPro) {
        try {
          await subscriptionAPI.upgrade("pro");
        } catch {}
      }

      // Load usage info from backend
      const { data } = await subscriptionAPI.getInfo();
      const sub = data.subscription;
      const tier = hasPro ? "pro" : sub.tier;

      // Pre-load the current offering for the paywall
      let currentOffering: any = null;
      if (Purchases) {
        try {
          const offerings = await Purchases.getOfferings();
          if (offerings.current?.availablePackages.length) {
            currentOffering = offerings.current.availablePackages[0];
          }
        } catch {}
      }

      set({
        tier,
        isPro: tier === "pro",
        digestsToday: sub.usage.digestsToday,
        maxDigests: tier === "pro" ? Infinity : sub.usage.maxDigests,
        canSendEmail: tier === "pro",
        canSchedule: tier === "pro",
        currentOffering,
        loaded: true,
      });
    } catch (err) {
      console.error("Failed to load subscription:", err);
      set({ loaded: true });
    }
  },

  refreshUsage: async () => {
    try {
      const { data } = await subscriptionAPI.getInfo();
      const sub = data.subscription;
      set({
        digestsToday: sub.usage.digestsToday,
        maxDigests: sub.usage.maxDigests,
      });
    } catch (err) {
      console.error("Failed to refresh usage:", err);
    }
  },

  purchase: async () => {
    const { currentOffering } = get();
    if (!currentOffering) return false;

    const Purchases = await getPurchasesModule();
    if (!Purchases) return false;

    set({ purchasing: true });
    try {
      const { customerInfo } = await Purchases.purchasePackage(currentOffering);
      const hasPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      if (hasPro) {
        try {
          await subscriptionAPI.upgrade("pro");
        } catch {}

        set({
          tier: "pro",
          isPro: true,
          canSendEmail: true,
          canSchedule: true,
          maxDigests: Infinity,
          purchasing: false,
        });
        return true;
      }

      set({ purchasing: false });
      return false;
    } catch (err: any) {
      set({ purchasing: false });
      if (err.userCancelled) return false;
      console.error("Purchase failed:", err);
      throw err;
    }
  },

  restore: async () => {
    const Purchases = await getPurchasesModule();
    if (!Purchases) return false;

    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      if (hasPro) {
        try {
          await subscriptionAPI.upgrade("pro");
        } catch {}

        set({
          tier: "pro",
          isPro: true,
          canSendEmail: true,
          canSchedule: true,
          maxDigests: Infinity,
        });
      }

      return hasPro;
    } catch (err) {
      console.error("Restore failed:", err);
      throw err;
    }
  },
}));

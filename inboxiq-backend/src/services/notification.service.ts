import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { supabase } from "../config/supabase";

const expo = new Expo();

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ─── Send push notification to a user ────────────────────────────
export const sendPushNotification = async (
  userId: string,
  payload: NotificationPayload
): Promise<void> => {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("expo_push_token")
      .eq("id", userId)
      .single();

    if (!user?.expo_push_token || !Expo.isExpoPushToken(user.expo_push_token)) {
      console.log(`⚠️  No valid push token for user ${userId}, skipping notification`);
      return;
    }

    const message: ExpoPushMessage = {
      to: user.expo_push_token,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    };

    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log(`📱 Push sent to user ${userId}:`, receipts);
    }
  } catch (err) {
    console.error(`Failed to send push notification to ${userId}:`, err);
  }
};

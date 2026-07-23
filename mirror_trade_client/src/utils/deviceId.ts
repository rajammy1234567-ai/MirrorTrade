import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_KEY = "mt_device_id";

/** Simple UUID v4 for Expo Go (no native device APIs required). */
function randomId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Stable per-install device fingerprint stored in AsyncStorage.
 * Sent on signup/login so the API can block multi-account referral farming.
 */
export async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = randomId();
    await AsyncStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    // Storage unavailable (web private mode etc.) — ephemeral id for this session
    return `ephemeral-${randomId()}`;
  }
}

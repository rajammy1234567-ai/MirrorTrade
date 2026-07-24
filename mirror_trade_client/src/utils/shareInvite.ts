import { Alert, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  getMyReferralCodeRequest,
  type ReferralStatsResponse,
} from "../config/api";

export type InvitePayload = {
  referralCode: string;
  inviteLink: string;
  rewardPerUser: number;
  shareMessage: string;
  stats?: ReferralStatsResponse["data"]["stats"];
};

/** Build share text from code + reward. */
export function buildShareMessage(
  code: string,
  inviteLink: string,
  reward = 50
) {
  return `Join me on MirrorTrade! 🚀\n\nUse my referral code: ${code}\nWe both get $${reward} USDT after you verify.\n\nSign up: ${inviteLink}`;
}

/**
 * Load invite code/link from API (falls back to local code if offline).
 */
export async function loadInvitePayload(
  fallbackCode?: string | null
): Promise<InvitePayload> {
  const fallback =
    (fallbackCode && String(fallbackCode).trim()) || "MIRROR";
  try {
    const res = await getMyReferralCodeRequest();
    if (res.success && res.data?.referralCode) {
      const code = res.data.referralCode;
      const inviteLink =
        res.data.inviteLink ||
        `https://mirrortrade.app/signup?ref=${encodeURIComponent(code)}`;
      const reward = res.data.rewardPerUser ?? 50;
      return {
        referralCode: code,
        inviteLink,
        rewardPerUser: reward,
        shareMessage: buildShareMessage(code, inviteLink, reward),
        stats: res.data.stats,
      };
    }
  } catch {
    // use fallback below
  }

  const inviteLink = `https://mirrortrade.app/signup?ref=${encodeURIComponent(fallback)}`;
  return {
    referralCode: fallback,
    inviteLink,
    rewardPerUser: 50,
    shareMessage: buildShareMessage(fallback, inviteLink, 50),
  };
}

/**
 * Opens system share sheet (WhatsApp / SMS / Messages / etc.).
 * Expo Go compatible — RN Share API only.
 */
export async function openShareInvite(payload: InvitePayload) {
  try {
    await Share.share(
      Platform.OS === "ios"
        ? { message: payload.shareMessage, url: payload.inviteLink }
        : {
            message: payload.shareMessage,
            title: "Invite friends to MirrorTrade",
          }
    );
  } catch {
    // user cancelled
  }
}

/** Load invite then open share sheet in one step (Home / Profile buttons). */
export async function shareMyInvite(fallbackCode?: string | null) {
  const payload = await loadInvitePayload(fallbackCode);
  if (!payload.referralCode || payload.referralCode === "—") {
    Alert.alert(
      "Login required",
      "Sign in to get your referral code and invite friends."
    );
    return null;
  }
  await openShareInvite(payload);
  return payload;
}

export async function copyInviteCode(code: string) {
  await Clipboard.setStringAsync(code);
  Alert.alert("Copied", `Code ${code} copied to clipboard`);
}

export async function copyInviteLink(link: string) {
  await Clipboard.setStringAsync(link);
  Alert.alert("Copied", "Invite link copied");
}

import { randomBytes } from "crypto";
import { getAppUrl } from "@/lib/env";

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function getInviteUrl(token: string): string {
  return `${getAppUrl()}/invite/${token}`;
}

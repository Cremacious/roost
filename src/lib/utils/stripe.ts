import Stripe from "stripe";
import {
  getAppUrl,
  getStripePriceId,
  getStripeSecretKey,
} from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  stripeClient = new Stripe(getStripeSecretKey(), {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
  });

  return stripeClient;
}

export function getStripePrice(): string {
  return getStripePriceId();
}

export function getStripeAppUrl(): string {
  return getAppUrl();
}

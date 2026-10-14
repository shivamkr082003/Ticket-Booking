import type { Appearance } from "@stripe/stripe-js";
import type { Theme } from "../context/ThemeContext.tsx";

// Stripe's PaymentElement renders in an iframe, so it can't read our CSS
// variables — mirror the theme tokens here instead.
export function stripeAppearance(theme: Theme): Appearance {
  return theme === "dark"
    ? {
        theme: "night",
        variables: {
          colorPrimary:    "#9b5cff",
          colorBackground: "#1f1a33",
          colorText:       "#f1eefa",
          colorDanger:     "#ef4444",
          borderRadius:    "10px",
          fontFamily:      "'DM Sans', system-ui, sans-serif",
        },
      }
    : {
        theme: "stripe",
        variables: {
          colorPrimary:    "#6d28d9",
          colorBackground: "#ffffff",
          colorText:       "#1e1830",
          colorDanger:     "#dc2626",
          borderRadius:    "10px",
          fontFamily:      "'DM Sans', system-ui, sans-serif",
        },
      };
}

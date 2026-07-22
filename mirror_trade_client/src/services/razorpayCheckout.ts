import { Platform } from "react-native";

export type RazorpayOrderPayload = {
  orderId: string;
  amount: number; // paise
  amountInr: number;
  currency: string;
  keyId: string;
  companyName: string;
  paymentId: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  description: string;
};

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutResult =
  | { status: "success"; data: RazorpaySuccess }
  | { status: "cancelled"; reason?: string }
  | { status: "failed"; reason: string };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (resp: unknown) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      // already loaded
      if (window.Razorpay) resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Web: open Razorpay Standard Checkout (Checkout.js)
 */
export async function openRazorpayWeb(
  order: RazorpayOrderPayload
): Promise<RazorpayCheckoutResult> {
  const ok = await loadRazorpayScript();
  if (!ok || !window.Razorpay) {
    return {
      status: "failed",
      reason: "Unable to load Razorpay Checkout. Check network / ad-blockers.",
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: RazorpayCheckoutResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || "INR",
      name: order.companyName || "MirrorTrade",
      description: order.description,
      order_id: order.orderId,
      prefill: {
        name: order.prefill?.name || "",
        email: order.prefill?.email || "",
        contact: order.prefill?.contact || "",
      },
      theme: {
        color: "#5B6CFF",
      },
      modal: {
        ondismiss: () => {
          finish({ status: "cancelled", reason: "Checkout closed" });
        },
      },
      handler: (response: RazorpaySuccess) => {
        finish({ status: "success", data: response });
      },
    });

    rzp.on("payment.failed", (resp: unknown) => {
      const err = resp as { error?: { description?: string } };
      finish({
        status: "failed",
        reason: err?.error?.description || "Payment failed",
      });
    });

    rzp.open();
  });
}

/**
 * HTML shell for WebView-based Razorpay Checkout (iOS / Android Expo)
 */
export function buildRazorpayCheckoutHtml(order: RazorpayOrderPayload): string {
  const options = {
    key: order.keyId,
    amount: order.amount,
    currency: order.currency || "INR",
    name: order.companyName || "MirrorTrade",
    description: order.description,
    order_id: order.orderId,
    prefill: {
      name: order.prefill?.name || "",
      email: order.prefill?.email || "",
      contact: order.prefill?.contact || "",
    },
    theme: { color: "#5B6CFF" },
  };

  // Inject carefully — order fields are server-generated
  const optionsJson = JSON.stringify(options);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>MirrorTrade Payment</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0B0E14;
      color: #F4F6FB;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .box { text-align: center; padding: 24px; }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #252B3A;
      border-top-color: #5B6CFF; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #8B93A7; font-size: 14px; }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <p>Opening secure Razorpay checkout…</p>
  </div>
  <script>
    (function () {
      function post(payload) {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        } catch (e) {}
      }

      function start() {
        if (typeof Razorpay === "undefined") {
          post({ status: "failed", reason: "Razorpay SDK failed to load" });
          return;
        }
        var options = ${optionsJson};
        options.handler = function (response) {
          post({
            status: "success",
            data: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            }
          });
        };
        options.modal = {
          ondismiss: function () {
            post({ status: "cancelled", reason: "Checkout closed" });
          }
        };
        var rzp = new Razorpay(options);
        rzp.on("payment.failed", function (resp) {
          var msg = (resp && resp.error && resp.error.description) || "Payment failed";
          post({ status: "failed", reason: msg });
        });
        rzp.open();
      }

      if (document.readyState === "complete") start();
      else window.onload = start;
    })();
  </script>
</body>
</html>`;
}

export function isWebPlatform() {
  return Platform.OS === "web";
}

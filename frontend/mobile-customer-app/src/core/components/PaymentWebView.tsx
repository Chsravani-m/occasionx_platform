import React, { useMemo } from "react";
import { Modal, View, StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { colors } from "@/core/theme/colors";

// Razorpay has no first-class Expo Go module (react-native-razorpay
// is a native module that needs a custom EAS dev build, not just
// Expo Go). This renders their standard hosted checkout.js inside a
// WebView instead - same order_id/key_id flow the web app uses, same
// backend endpoints, just wrapped so it runs in plain Expo Go with no
// native linking or custom build required.
export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface Props {
  visible: boolean;
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  name?: string;
  description?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
  onSuccess: (result: RazorpaySuccess) => void;
  onDismiss: () => void;
}

export default function PaymentWebView({
  visible,
  keyId,
  amount,
  currency,
  orderId,
  name = "OccasionX",
  description = "Booking payment",
  prefillName,
  prefillEmail,
  prefillContact,
  onSuccess,
  onDismiss,
}: Props) {
  const html = useMemo(
    () => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>html,body{margin:0;padding:0;background:#fff;height:100%;}</style>
</head>
<body>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function post(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
    var options = {
      key: ${JSON.stringify(keyId)},
      amount: ${JSON.stringify(amount)},
      currency: ${JSON.stringify(currency)},
      order_id: ${JSON.stringify(orderId)},
      name: ${JSON.stringify(name)},
      description: ${JSON.stringify(description)},
      prefill: {
        name: ${JSON.stringify(prefillName || "")},
        email: ${JSON.stringify(prefillEmail || "")},
        contact: ${JSON.stringify(prefillContact || "")}
      },
      theme: { color: "#1E3A8A" },
      handler: function (response) {
        post({ type: "success", response: response });
      },
      modal: {
        ondismiss: function () {
          post({ type: "dismiss" });
        }
      }
    };
    try {
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        post({ type: "failed", error: resp.error });
      });
      rzp.open();
    } catch (e) {
      post({ type: "error", message: String(e) });
    }
  </script>
</body>
</html>`,
    [keyId, amount, currency, orderId, name, description, prefillName, prefillEmail, prefillContact]
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "success") {
        onSuccess({
          razorpay_order_id: data.response.razorpay_order_id,
          razorpay_payment_id: data.response.razorpay_payment_id,
          razorpay_signature: data.response.razorpay_signature,
        });
      } else {
        // dismiss / failed / error - all treated as "not paid", the
        // booking stays AWAITING_PAYMENT, matching web app behavior.
        onDismiss();
      }
    } catch {
      onDismiss();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          onMessage={handleMessage}
          style={styles.webview}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  webview: { flex: 1 },
});

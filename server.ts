import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(cors());
app.use(express.json());

// Add Permissions-Policy header to allow Payment Request API in iframes
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'payment=*');
  next();
});

const GATEWAY_URL = process.env.MASTERCARD_GATEWAY_URL || "https://ap-gateway.mastercard.com";
const MERCHANT_ID = (process.env.MASTERCARD_MERCHANT_ID || "").trim();
const API_PASSWORD = (process.env.MASTERCARD_API_PASSWORD || "").trim();
const AUTH_HEADER = `Basic ${Buffer.from(`merchant.${MERCHANT_ID}:${API_PASSWORD}`).toString('base64')}`;

// ============================================================
// STEP 1: Create a simple session
// ============================================================
app.post("/api/payment/session", async (req, res) => {
  const { amount, currency, orderId } = req.body;

  if (!MERCHANT_ID || !API_PASSWORD) {
    return res.status(500).json({
      error: "Mastercard configuration missing",
      message: "Please ensure MASTERCARD_MERCHANT_ID and MASTERCARD_API_PASSWORD are set."
    });
  }

  try {
    console.log(`[Session] Creating session for order: ${orderId}, amount: ${amount} ${currency}`);

    const response = await fetch(
      `${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/session`,
      {
        method: "POST",
        headers: {
          "Authorization": AUTH_HEADER,
          "Content-Type": "application/json;charset=UTF-8",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          session: {
            authenticationLimit: 5
          }
        })
      }
    );

    const data: any = await response.json();

    if (response.ok && data.session && data.session.id) {
      res.json({
        sessionId: data.session.id,
        merchantId: MERCHANT_ID,
        gatewayUrl: GATEWAY_URL
      });
    } else {
      console.error("[Session] Error:", data);
      res.status(response.status || 500).json({ error: "Failed to create session", details: data });
    }
  } catch (error: any) {
    console.error("[Session] Server Error:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// ============================================================
// STEP 2: Initiate 3DS Authentication
// ============================================================
app.post("/api/payment/initiate-auth", async (req, res) => {
  const { orderId, transactionId, sessionId, currency } = req.body;

  try {
    const url = `${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": AUTH_HEADER,
        "Content-Type": "application/json;charset=UTF-8"
      },
      body: JSON.stringify({
        apiOperation: "INITIATE_AUTHENTICATION",
        authentication: {
          acceptVersions: "3DS1,3DS2",
          channel: "PAYER_BROWSER",
          purpose: "PAYMENT_TRANSACTION"
        },
        session: {
          id: sessionId
        },
        order: {
          currency: currency || "JOD"
        }
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// STEP 3: Authenticate Payer
// ============================================================
app.post("/api/payment/authenticate", async (req, res) => {
  const { orderId, transactionId, sessionId, amount, currency, browserDetails } = req.body;

  try {
    const url = `${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": AUTH_HEADER,
        "Content-Type": "application/json;charset=UTF-8"
      },
      body: JSON.stringify({
        apiOperation: "AUTHENTICATE_PAYER",
        authentication: {
          redirectResponseUrl: browserDetails?.returnUrl || `${req.protocol}://${req.get('host')}/api/payment/3ds-callback`
        },
        device: {
          browser: "MOZILLA",
          browserDetails: {
            javaEnabled: browserDetails?.javaEnabled || false,
            language: browserDetails?.language || "en-US",
            screenHeight: browserDetails?.screenHeight || 768,
            screenWidth: browserDetails?.screenWidth || 1366,
            timeZone: browserDetails?.timeZone || -180,
            colorDepth: browserDetails?.colorDepth || 24,
            "3DSecureChallengeWindowSize": "FULL_SCREEN",
            acceptHeaders: "text/html"
          },
          ipAddress: req.ip
        },
        order: {
          amount: String(Number(amount).toFixed(2)),
          currency: currency || "JOD"
        },
        session: {
          id: sessionId
        }
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// STEP 3.5: Handle 3DS Redirect Callback
// ============================================================
app.post("/api/payment/3ds-callback", (req, res) => {
  const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head><title>3DS Complete</title></head>
    <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0c10;color:white;">
      <div style="text-align:center;padding:20px;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <h3 style="margin:0 0 8px">تم التحقق بنجاح</h3>
        <p style="opacity:0.6;font-size:13px;margin:0">جاري إتمام الدفع...</p>
      </div>
      <script>
        function notify() {
          var targets = [];
          try { if (window.opener) targets.push(window.opener); } catch(e) {}
          try { if (window.top && window.top !== window) targets.push(window.top); } catch(e) {}
          try { if (window.parent && window.parent !== window) targets.push(window.parent); } catch(e) {}
          targets.forEach(function(t) { try { t.postMessage('3ds_challenge_complete', '*'); } catch(e) {} });
        }
        notify();
        setTimeout(notify, 500);
      </script>
    </body>
    </html>
  `;
  res.send(htmlResponse);
});

// ============================================================
// STEP 4: Execute the Payment (PAY API)
// ============================================================
app.post("/api/payment/pay", async (req, res) => {
  const { orderId, sessionId, amount, currency, authTransactionId } = req.body;

  try {
    const payTransactionId = `pay-${Date.now()}`;
    const url = `${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${payTransactionId}`;

    const body: any = {
      apiOperation: "PAY",
      order: {
        amount: String(Number(amount).toFixed(2)),
        currency: currency || "JOD",
        reference: orderId,
        description: `NY11 Payment - ${orderId}`
      },
      session: {
        id: sessionId
      }
    };

    if (authTransactionId) {
      body.authentication = {
        transactionId: authTransactionId
      };
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": AUTH_HEADER,
        "Content-Type": "application/json;charset=UTF-8"
      },
      body: JSON.stringify(body)
    });

    const data: any = await response.json();

    if (data.result === "SUCCESS") {
      res.json({
        success: true,
        result: data.result,
        status: data.order?.status,
        amount: data.order?.amount,
        currency: data.order?.currency,
        transactionId: payTransactionId,
        gatewayCode: data.response?.gatewayCode
      });
    } else {
      res.json({
        success: false,
        result: data.result,
        error: data.error || data.response,
        gatewayCode: data.response?.gatewayCode,
        details: data
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// Order Status Query
// ============================================================
app.get("/api/payment/order-status/:orderId", async (req, res) => {
  const { orderId } = req.params;
  try {
    const response = await fetch(
      `${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/order/${orderId}`,
      { method: "GET", headers: { "Authorization": AUTH_HEADER, "Content-Type": "application/json" } }
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Static files
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Payment server running on port ${PORT}`);
});

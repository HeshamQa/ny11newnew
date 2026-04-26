import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { Buffer } from "buffer";

export const app = express();

async function startServer() {
  app.set('trust proxy', true);
  app.use(cors());
  app.use(express.json());

  // Add Permissions-Policy and Private Network Access headers
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'payment=*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
  });

  const GATEWAY_URL = process.env.MASTERCARD_GATEWAY_URL || "https://ap-gateway.mastercard.com";
  const MERCHANT_ID = (process.env.MASTERCARD_MERCHANT_ID || "").trim();
  const API_PASSWORD = (process.env.MASTERCARD_API_PASSWORD || "").trim();
  const AUTH_HEADER = `Basic ${Buffer.from(`merchant.${MERCHANT_ID}:${API_PASSWORD}`).toString('base64')}`;

  // CALLBACK_BASE_URL must be a public HTTPS URL for 3DS to work.
  // For local dev across a network, set this to your ngrok URL, e.g.:
  //   CALLBACK_BASE_URL=https://xxxx-xx-xx.ngrok-free.app
  const CALLBACK_BASE_URL = (process.env.CALLBACK_BASE_URL || "").trim();

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

      const data = await response.json();
      console.log("[Session] Response:", JSON.stringify(data, null, 2));

      if (response.ok && data.session && data.session.id) {
        res.json({
          sessionId: data.session.id,
          merchantId: MERCHANT_ID,
          gatewayUrl: GATEWAY_URL
        });
      } else {
        console.error(`[Session] Error ${response.status}:`, data);
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
      console.log(`[3DS-Initiate] Order: ${orderId}, Transaction: ${transactionId}`);

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
      console.error("[3DS-Initiate] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // STEP 3: Authenticate Payer
  // ============================================================
  app.post("/api/payment/authenticate", async (req, res) => {
    const { orderId, transactionId, sessionId, amount, currency, browserDetails } = req.body;

    try {
      console.log(`[3DS-Auth] Order: ${orderId}, Transaction: ${transactionId}`);

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
            redirectResponseUrl: CALLBACK_BASE_URL
              ? `${CALLBACK_BASE_URL}/api/payment/3ds-callback`
              : (browserDetails?.returnUrl || `${req.protocol}://${req.get('host')}/api/payment/3ds-callback`)
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
      console.error("[3DS-Auth] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // STEP 3.5: Handle 3DS Redirect Callback
  // ============================================================
  app.options("/api/payment/3ds-callback", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.sendStatus(204);
  });

  app.post("/api/payment/3ds-callback", (req, res) => {
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head><title>3DS Complete</title></head>
      <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0c10;color:white;">
        <div style="text-align:center;padding:20px;">
          <div style="font-size:48px;margin-bottom:16px;">🛡️</div>
          <h3 style="color:#primary;margin:0 0 8px">NY11 Security</h3>
          <p style="color:#888;font-size:14px;margin:0">Verifying your payment...</p>
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
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.send(htmlResponse);
  });

  // ============================================================
  // STEP 4: Execute the Payment (PAY API)
  // ============================================================
  app.post("/api/payment/pay", async (req, res) => {
    const { orderId, sessionId, amount, currency, authTransactionId } = req.body;

    try {
      const payTransactionId = `pay-${Date.now()}`;
      console.log(`[PAY] Order: ${orderId}, Pay Transaction: ${payTransactionId}`);

      const url = `${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${payTransactionId}`;

      const body: any = {
        apiOperation: "PAY",
        order: {
          amount: String(Number(amount).toFixed(2)),
          currency: currency || "JOD",
          reference: orderId,
          description: `NY11 Purchase - ${orderId}`
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

      const data = await response.json();
      
      if (data.result === "SUCCESS") {
        res.json({
          success: true,
          result: data.result,
          status: data.order?.status,
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
      console.error("[PAY] Error:", error);
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NY11 Server running on http://localhost:${PORT}`);
  });
}

startServer();

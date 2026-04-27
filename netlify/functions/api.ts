import { Handler } from "@netlify/functions";
import { Buffer } from "buffer";

const GATEWAY_URL = process.env.MASTERCARD_GATEWAY_URL || "https://ap-gateway.mastercard.com";
const MERCHANT_ID = (process.env.MASTERCARD_MERCHANT_ID || "").trim();
const API_PASSWORD = (process.env.MASTERCARD_API_PASSWORD || "").trim();
const AUTH_HEADER = `Basic ${Buffer.from(`merchant.${MERCHANT_ID}:${API_PASSWORD}`).toString('base64')}`;

export const handler: Handler = async (event, context) => {
  const path = event.path.replace("/.netlify/functions/api", "").replace("/api", "");
  const method = event.httpMethod;

  // Basic headers for all responses
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Private-Network": "true",
    "Permissions-Policy": "payment=*"
  };

  if (method === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  try {
    // ---------------------------------------------------------
    // POST /payment/session
    // ---------------------------------------------------------
    if (path === "/payment/session" && method === "POST") {
      const { amount, currency, orderId } = JSON.parse(event.body || "{}");
      
      const response = await fetch(`${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/session`, {
        method: "POST",
        headers: {
          "Authorization": AUTH_HEADER,
          "Content-Type": "application/json;charset=UTF-8",
          "Accept": "application/json"
        },
        body: JSON.stringify({ session: { authenticationLimit: 5 } })
      });

      const data = await response.json();
      if (response.ok) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ sessionId: data.session.id, merchantId: MERCHANT_ID, gatewayUrl: GATEWAY_URL })
        };
      }
      return { statusCode: response.status, headers, body: JSON.stringify(data) };
    }

    // ---------------------------------------------------------
    // POST /payment/initiate-auth
    // ---------------------------------------------------------
    if (path === "/payment/initiate-auth" && method === "POST") {
      const { orderId, transactionId, sessionId, currency } = JSON.parse(event.body || "{}");
      const url = `${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Authorization": AUTH_HEADER, "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({
          apiOperation: "INITIATE_AUTHENTICATION",
          authentication: { acceptVersions: "3DS1,3DS2", channel: "PAYER_BROWSER", purpose: "PAYMENT_TRANSACTION" },
          session: { id: sessionId },
          order: { currency: currency || "JOD" }
        })
      });

      const data = await response.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ---------------------------------------------------------
    // POST /payment/authenticate
    // ---------------------------------------------------------
    if (path === "/payment/authenticate" && method === "POST") {
      const { orderId, transactionId, sessionId, amount, currency, browserDetails } = JSON.parse(event.body || "{}");
      const url = `${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;

      // On Netlify, we use the host from the event
      const callbackUrl = `${event.headers.origin || `https://${event.headers.host}`}/api/payment/3ds-callback`;

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Authorization": AUTH_HEADER, "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({
          apiOperation: "AUTHENTICATE_PAYER",
          authentication: { redirectResponseUrl: callbackUrl },
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
            ipAddress: event.headers["client-ip"] || "127.0.0.1"
          },
          order: { amount: String(Number(amount).toFixed(2)), currency: currency || "JOD" },
          session: { id: sessionId }
        })
      });

      const data = await response.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ---------------------------------------------------------
    // POST /payment/3ds-callback (Handles the HTML response)
    // ---------------------------------------------------------
    if (path === "/payment/3ds-callback") {
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
      return {
        statusCode: 200,
        headers: { ...headers, "Content-Type": "text/html" },
        body: htmlResponse
      };
    }

    // ---------------------------------------------------------
    // POST /payment/pay
    // ---------------------------------------------------------
    if (path === "/payment/pay" && method === "POST") {
      const { orderId, sessionId, amount, currency, authTransactionId } = JSON.parse(event.body || "{}");
      const payTransactionId = `pay-${Date.now()}`;
      const url = `${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${payTransactionId}`;

      const body: any = {
        apiOperation: "PAY",
        order: {
          amount: String(Number(amount).toFixed(2)),
          currency: currency || "JOD",
          reference: orderId,
          description: `NY11 Purchase - ${orderId}`
        },
        session: { id: sessionId }
      };

      if (authTransactionId) {
        body.authentication = { transactionId: authTransactionId };
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Authorization": AUTH_HEADER, "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.result === "SUCCESS") {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            result: data.result,
            status: data.order?.status,
            transactionId: payTransactionId,
            gatewayCode: data.response?.gatewayCode
          })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          result: data.result,
          error: data.error || data.response,
          gatewayCode: data.response?.gatewayCode,
          details: data
        })
      };
    }

    // ---------------------------------------------------------
    // GET /payment/order-status/:orderId
    // ---------------------------------------------------------
    if (path.startsWith("/payment/order-status/") && method === "GET") {
      const orderId = path.split("/").pop();
      const response = await fetch(`${GATEWAY_URL}/api/rest/version/100/merchant/${MERCHANT_ID}/order/${orderId}`, {
        method: "GET",
        headers: { "Authorization": AUTH_HEADER, "Content-Type": "application/json" }
      });
      const data = await response.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: "Not Found", path }) };

  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message })
    };
  }
};

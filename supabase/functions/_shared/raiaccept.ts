/**
 * RaiAccept (Raiffeisen Bank Albania) API client — per docs.raiaccept.com
 * "Code integration". Flow: authenticate (Cognito wrapper endpoint) →
 * create order entry → create payment session (same payload) → redirect the
 * consumer to the hosted payment form. Webhooks notify status changes; the
 * final status must be re-verified via Retrieve order details/transactions.
 */

const AUTH_URL = Deno.env.get("RAIACCEPT_AUTH_URL") ?? "https://authenticate.raiaccept.com";
const BASE_URL = Deno.env.get("RAIACCEPT_BASE_URL") ?? "https://trapi.raiaccept.com";
const PAYMENT_URL = Deno.env.get("RAIACCEPT_PAYMENT_URL") ?? "https://payment.raiaccept.com";
const CLIENT_ID = Deno.env.get("RAIACCEPT_CLIENT_ID") ?? "kr2gs4117arvbnaperqff5dml";

let cached: { token: string; exp: number } | null = null;

/** Authentication → Bearer IdToken. */
export async function getRaiToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const username = Deno.env.get("RAIACCEPT_USERNAME");
  const password = Deno.env.get("RAIACCEPT_PASSWORD");
  if (!username || !password) throw new Error("RaiAccept credentials not configured");

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    }),
  });
  const json = await res.json();
  const token = json?.AuthenticationResult?.IdToken;
  if (!token) throw new Error("RaiAccept auth failed: " + JSON.stringify(json).slice(0, 300));
  const ttl = (json?.AuthenticationResult?.ExpiresIn ?? 3600) * 1000;
  cached = { token, exp: Date.now() + ttl };
  return token;
}

async function api(path: string, init: RequestInit = {}) {
  const token = await getRaiToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`RaiAccept ${path} ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}

export interface OrderInput {
  /** Whole ALL. 0 = card verification only (stores the card, no charge). */
  amountAll: number;
  description: string;
  /** Unique per attempt — alphanumeric/hyphens/underscores (we use the payment row uuid). */
  merchantOrderReference: string;
  email?: string | null;
  /** Consumer id in OUR db — enables one-click checkout + card tokenization. */
  customerReference: string;
  successUrl: string;
  cancelUrl: string;
  failUrl: string;
  notificationUrl: string;
  /** Charge a previously stored card token (renewals). */
  cardToken?: string | null;
}

/** Payload shared verbatim by Create-order-entry and Create-payment-session
    (the docs require identical parameters in both calls). */
export function buildOrderPayload(i: OrderInput) {
  return {
    ...(i.email ? { consumer: { email: i.email } } : {}),
    invoice: {
      amount: i.amountAll,
      currency: "ALL",
      description: i.description,
      merchantOrderReference: i.merchantOrderReference,
      items: [{ description: i.description.slice(0, 100), numberOfItems: 1, price: i.amountAll }],
    },
    paymentMethodPreference: "CARD",
    urls: {
      successUrl: i.successUrl,
      cancelUrl: i.cancelUrl,
      failUrl: i.failUrl,
      notificationUrl: i.notificationUrl,
    },
    // Live-verified 2026-07-02: zero-amount card verification is accepted
    // ONLY in pure token flow — customerReference must be omitted then.
    recurring: i.amountAll === 0
      ? { recurringModel: "ONE_CLICK_CHECKOUT" }
      : {
          customerReference: i.customerReference,
          recurringModel: "ONE_CLICK_CHECKOUT",
          ...(i.cardToken ? { cardToken: i.cardToken } : {}),
        },
  };
}

/** Step 2: create the order db entry. Returns orderIdentification. */
export async function createOrderEntry(payload: ReturnType<typeof buildOrderPayload>) {
  const res = await api("/orders", { method: "POST", body: JSON.stringify(payload) });
  const orderIdentification = res?.orderIdentification;
  if (!orderIdentification) throw new Error("No orderIdentification in response: " + JSON.stringify(res).slice(0, 300));
  return { orderIdentification: String(orderIdentification), raw: res };
}

/** Step 3: create the payment form session (same payload). Returns form URL. */
export async function createPaymentSession(orderIdentification: string, payload: ReturnType<typeof buildOrderPayload>) {
  const res = await api(`/orders/${encodeURIComponent(orderIdentification)}/checkout`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  // Live-verified response shape (2026-07-02): { sessionId, paymentRedirectURL }.
  let url: string | null = res?.paymentRedirectURL ?? res?.url ?? res?.formUrl ?? null;
  if (!url) {
    const session = res?.sessionId ?? res?.paymentSession ?? res?.session;
    if (session) url = `${PAYMENT_URL}/checkout?paymentSession=${encodeURIComponent(String(session))}`;
  }
  if (!url) throw new Error("No payment session URL in response: " + JSON.stringify(res).slice(0, 300));
  // Albanian payment form for the local market.
  url += (url.includes("?") ? "&" : "?") + "preferredLocale=al";
  return { url, raw: res };
}

/** Retrieve order details (webhook verification). */
export function getOrder(orderIdentification: string) {
  return api(`/orders/${encodeURIComponent(orderIdentification)}`);
}

/** Retrieve all transactions for an order (webhook verification). */
export function getOrderTransactions(orderIdentification: string) {
  return api(`/orders/${encodeURIComponent(orderIdentification)}/transactions`, { method: "POST" });
}

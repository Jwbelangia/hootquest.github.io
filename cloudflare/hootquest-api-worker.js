export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(env)
      });
    }

    if (request.method === "POST" && url.pathname === "/create-checkout-session") {
      return handleCreateCheckoutSession(request, env);
    }

    if (request.method === "POST" && url.pathname === "/stripe-webhook") {
      return handleStripeWebhook(request, env);
    }

    return new Response(JSON.stringify({
      ok: true,
      service: "hootquest-api",
      routes: ["/create-checkout-session", "/stripe-webhook"]
    }), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }

async function handleStripeWebhook(request, env) {
  try {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      return jsonResponse({ ok: false, message: "Missing STRIPE_WEBHOOK_SECRET." }, 500, {
        "content-type": "application/json"
      });
    }

    if (!env.APPS_SCRIPT_ORDER_ENDPOINT || !env.APPS_SCRIPT_SHARED_SECRET) {
      return jsonResponse({ ok: false, message: "Missing Apps Script sync configuration." }, 500, {
        "content-type": "application/json"
      });
    }

    const signatureHeader = request.headers.get("stripe-signature") || "";
    const rawBody = await request.text();

    if (!signatureHeader) {
      return jsonResponse({ ok: false, message: "Missing Stripe signature header." }, 400, {
        "content-type": "application/json"
      });
    }

    const isVerified = await verifyStripeWebhookSignature(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);

    if (!isVerified) {
      return jsonResponse({ ok: false, message: "Invalid Stripe webhook signature." }, 400, {
        "content-type": "application/json"
      });
    }

    const event = JSON.parse(rawBody);

    if (event.type !== "checkout.session.completed") {
      return jsonResponse({ ok: true, ignored: true, eventType: event.type }, 200, {
        "content-type": "application/json"
      });
    }

    const session = event.data?.object || {};
    const invoiceNumber = String(session.client_reference_id || session.metadata?.invoiceNumber || "").trim();

    if (!invoiceNumber) {
      return jsonResponse({ ok: false, message: "Stripe session is missing an invoice number." }, 400, {
        "content-type": "application/json"
      });
    }

    const syncPayload = {
      action: "markPaymentPaid",
      sharedSecret: env.APPS_SCRIPT_SHARED_SECRET,
      invoiceNumber: invoiceNumber,
      paymentStatus: "Paid",
      paymentMethod: "Stripe",
      stripeSessionId: String(session.id || ""),
      stripePaymentIntentId: String(session.payment_intent || ""),
      customerEmail: String(session.customer_details?.email || session.customer_email || session.metadata?.email || ""),
      amountTotal: Number(session.amount_total || 0),
      currency: String(session.currency || "").toUpperCase(),
      figurineMemo: String(session.metadata?.figurineMemo || ""),
      packageSummary: String(session.metadata?.packageSummary || ""),
      siteCartIds: String(session.metadata?.siteCartIds || ""),
      stripeEventId: String(event.id || "")
    };

    const syncResponse = await fetch(env.APPS_SCRIPT_ORDER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(syncPayload)
    });

    const syncText = await syncResponse.text();
    let syncResult = {};

    try {
      syncResult = JSON.parse(syncText);
    } catch (error) {
      syncResult = { ok: false, raw: syncText };
    }

    if (!syncResponse.ok || !syncResult.ok) {
      return jsonResponse({
        ok: false,
        message: syncResult.message || "Apps Script payment sync failed.",
        syncResult: syncResult
      }, 502, {
        "content-type": "application/json"
      });
    }

    return jsonResponse({
      ok: true,
      invoiceNumber: invoiceNumber,
      paymentStatus: "Paid",
      syncResult: syncResult
    }, 200, {
      "content-type": "application/json"
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error && error.message ? error.message : "Unexpected Stripe webhook error."
    }, 500, {
      "content-type": "application/json"
    });
  }
}
    });
  }
};

async function handleCreateCheckoutSession(request, env) {
  const corsHeaders = getCorsHeaders(env);

  try {
    const payload = await request.json();
    const normalizedCart = normalizeCart(payload);

    if (!normalizedCart.length) {
      return jsonResponse({ ok: false, message: "Cart is empty." }, 400, corsHeaders);
    }

    const lineItems = buildStripeLineItems(normalizedCart, env);

    if (!lineItems.length) {
      return jsonResponse({ ok: false, message: "No valid Stripe items were found in the cart." }, 400, corsHeaders);
    }

    const figurineMemo = buildFigurineMemo(payload.figurineSelections || {});
    const siteOrigin = env.SITE_ORIGIN || "https://www.hootquest.com";
    const successUrl = `${siteOrigin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteOrigin}/?checkout=cancelled`;
    const invoiceNumber = String(payload.invoiceNumber || "").trim();
    const customerEmail = String(payload.email || "").trim();

    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", successUrl);
    body.set("cancel_url", cancelUrl);

    if (invoiceNumber) {
      body.set("client_reference_id", invoiceNumber);
      body.set("metadata[invoiceNumber]", invoiceNumber);
      body.set("payment_intent_data[metadata][invoiceNumber]", invoiceNumber);
    }

    if (customerEmail) {
      body.set("customer_email", customerEmail);
      body.set("metadata[email]", customerEmail);
      body.set("payment_intent_data[metadata][email]", customerEmail);
    }

    if (figurineMemo) {
      body.set("metadata[figurineMemo]", figurineMemo);
      body.set("payment_intent_data[metadata][figurineMemo]", figurineMemo);
    }

    if (payload.packageSummary) {
      body.set("metadata[packageSummary]", truncate(String(payload.packageSummary), 500));
    }

    if (payload.source) {
      body.set("metadata[source]", truncate(String(payload.source), 100));
    }

    body.set("metadata[siteCartIds]", normalizedCart.map(function (item) {
      return `${item.id}:${item.quantity}`;
    }).join("|"));

    for (let i = 0; i < lineItems.length; i++) {
      body.set(`line_items[${i}][price]`, lineItems[i].price);
      body.set(`line_items[${i}][quantity]`, String(lineItems[i].quantity));
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    const stripePayload = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return jsonResponse({
        ok: false,
        message: stripePayload?.error?.message || "Unable to create Stripe checkout session.",
        stripeError: stripePayload?.error?.type || "unknown"
      }, 400, corsHeaders);
    }

    return jsonResponse({
      ok: true,
      sessionId: stripePayload.id,
      checkoutUrl: stripePayload.url
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error && error.message ? error.message : "Unexpected Worker error."
    }, 500, corsHeaders);
  }
}

function normalizeCart(payload) {
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const merged = {};

  for (let i = 0; i < rawItems.length; i++) {
    const id = String(rawItems[i]?.id || "").trim();
    const quantity = Number(rawItems[i]?.quantity || 0);

    if (!id || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    merged[id] = Number(merged[id] || 0) + Math.floor(quantity);
  }

  return Object.keys(merged).map(function (id) {
    return {
      id: id,
      quantity: merged[id]
    };
  });
}

function buildStripeLineItems(cartItems, env) {
  const catalog = {
    "core-game": env.STRIPE_PRICE_CORE_GAME || "",
    "owlcrest-collectible": env.STRIPE_PRICE_OWLCREST_MEDIUM || ""
  };

  return cartItems.map(function (item) {
    return {
      price: catalog[item.id],
      quantity: item.quantity
    };
  }).filter(function (item) {
    return !!item.price && item.quantity > 0;
  });
}

function buildFigurineMemo(figurineSelections) {
  const keys = Object.keys(figurineSelections || {});
  const memoParts = [];

  for (let i = 0; i < keys.length; i++) {
    const quantity = Number(figurineSelections[keys[i]] || 0);

    if (quantity > 0) {
      memoParts.push(`${keys[i]}:${quantity}`);
    }
  }

  return truncate(memoParts.join("|"), 500);
}

function getCorsHeaders(env) {
  return {
    "access-control-allow-origin": env.ALLOWED_ORIGIN || "https://www.hootquest.com",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "content-type": "application/json"
  };
}

function jsonResponse(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: headers
  });
}

function truncate(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

async function verifyStripeWebhookSignature(rawBody, signatureHeader, secret) {
  const parsed = parseStripeSignatureHeader(signatureHeader);

  if (!parsed.timestamp || !parsed.signatures.length) {
    return false;
  }

  const ageInSeconds = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);

  if (ageInSeconds > 300) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expectedSignature = await computeHmacSha256Hex(signedPayload, secret);

  for (let i = 0; i < parsed.signatures.length; i++) {
    if (constantTimeEqual(parsed.signatures[i], expectedSignature)) {
      return true;
    }
  }

  return false;
}

function parseStripeSignatureHeader(headerValue) {
  const result = {
    timestamp: 0,
    signatures: []
  };
  const parts = String(headerValue || "").split(",");

  for (let i = 0; i < parts.length; i++) {
    const [key, value] = parts[i].split("=");
    const normalizedKey = String(key || "").trim();
    const normalizedValue = String(value || "").trim();

    if (normalizedKey === "t") {
      result.timestamp = Number(normalizedValue || 0);
    }

    if (normalizedKey === "v1" && normalizedValue) {
      result.signatures.push(normalizedValue);
    }
  }

  return result;
}

async function computeHmacSha256Hex(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const bytes = new Uint8Array(signature);
  let hex = "";

  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }

  return hex;
}

function constantTimeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");

  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;

  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-skillcredit-client",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Same rules as Payments.jsx: ₱10 = 1 credit + bonus
function calcCredits(php: number) {
  const base = Math.floor(php / 10);
  if (php >= 2000) return base + 40;
  if (php >= 1000) return base + 15;
  if (php >= 500) return base + 5;
  return base;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // 1. Who is the user? (from the login token sent by the website)
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // 2. Only allow your localhost and your live site
    const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const requestOrigin = req.headers.get("origin") ?? "";
    const isMobile = !requestOrigin && req.headers.get("x-skillcredit-client") === "mobile";
    // Browser requests still require an exact allowlisted origin.
    // Expo native fetch normally has no browser Origin header. Use an existing
    // trusted HTTPS Web origin for PayMongo's success/cancel redirect URLs.
    if (!isMobile && !allowed.includes(requestOrigin)) {
      return json({ error: "Origin not allowed" }, 403);
    }
    const origin = isMobile
      ? allowed.find((entry) => entry.startsWith("https://"))
      : requestOrigin;
    if (!origin) {
      return json({ error: "Mobile checkout requires an HTTPS site in ALLOWED_ORIGINS" }, 500);
    }

    // 3. Parse the request. Cancellation is authenticated and scoped to the
    // logged-in user's OWN pending top-up. This is an abandoned checkout label,
    // not a financial settlement; a later signed paid webhook overrides it.
    const payload = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (payload.action === "cancel_checkout") {
      const txId = payload.transaction_id;
      if (typeof txId !== "string" || !/^[0-9a-f-]{36}$/i.test(txId)) {
        return json({ error: "Invalid transaction id" }, 400);
      }
      const { data: tx, error: lookupError } = await admin
        .from("topup_transactions")
        .select("id, status")
        .eq("id", txId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!tx) return json({ error: "Transaction not found" }, 404);
      if (tx.status !== "pending") return json({ status: tx.status });

      // Conditional update prevents a cancellation from undoing a paid event.
      const { data: cancelled, error: cancelError } = await admin
        .from("topup_transactions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", tx.id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (cancelError) throw cancelError;
      if (cancelled) return json({ status: "cancelled" });
      const { data: latest, error: latestError } = await admin
        .from("topup_transactions")
        .select("status")
        .eq("id", tx.id)
        .eq("user_id", user.id)
        .single();
      if (latestError) throw latestError;
      return json({ status: latest.status });
    }

    if (payload.action != null) return json({ error: "Unsupported action" }, 400);
    // 4. Check the amount (existing checkout path)
    const { amount, return_path } = payload;
    if (!Number.isInteger(amount) || amount < 10 || amount % 10 !== 0 || amount > 50000) {
      return json({ error: "Invalid amount" }, 400);
    }
    const path =
      typeof return_path === "string" &&
      return_path.startsWith("/") &&
      !return_path.startsWith("//")
        ? return_path
        : "/payments";

    // 4. The server decides how many credits (not the browser)
    const credits = calcCredits(amount);

    // 5. Save the pending transaction
    const { data: tx, error: txErr } = await admin
      .from("topup_transactions")
      .insert({
        user_id: user.id,
        amount_php: amount,
        credits_added: credits,
        status: "pending",
        payment_method: "paymongo_checkout",
      })
      .select("id")
      .single();
    if (txErr) throw txErr;

    // 6. Ask PayMongo for a checkout link
    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(Deno.env.get("PAYMONGO_SECRET_KEY")! + ":"),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [{
              name: `SkillCredit Top-up: ${credits} credits`,
              quantity: 1,
              amount: amount * 100, // PayMongo uses centavos
              currency: "PHP",
            }],
            payment_method_types: ["gcash", "paymaya"],
            success_url: `${origin}${path}?status=success&tx=${tx.id}`,
            cancel_url: `${origin}${path}?status=cancelled&tx=${tx.id}`,
            description: "SkillCredit credit top-up",
            metadata: { transaction_id: tx.id, user_id: user.id },
          },
        },
      }),
    });
    const body = await res.json();

    if (!res.ok) {
      await admin
        .from("topup_transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", tx.id);
      return json({ error: body?.errors?.[0]?.detail ?? "PayMongo error" }, 502);
    }

    // 7. Save PayMongo's checkout id so the webhook can find this row later
    await admin
      .from("topup_transactions")
      .update({ paymongo_checkout_id: body.data.id })
      .eq("id", tx.id);

    return json({ checkout_url: body.data.attributes.checkout_url, transaction_id: tx.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
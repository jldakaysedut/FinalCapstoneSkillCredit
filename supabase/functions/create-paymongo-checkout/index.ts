import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const origin = req.headers.get("origin") ?? "";
    if (!allowed.includes(origin)) {
      return json({ error: "Origin not allowed" }, 403);
    }

    // 3. Check the amount
    const { amount, return_path } = await req.json();
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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

    return json({ checkout_url: body.data.attributes.checkout_url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
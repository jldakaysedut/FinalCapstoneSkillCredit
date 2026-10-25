import { createClient } from "npm:@supabase/supabase-js@2";

const enc = new TextEncoder();

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  // 1. Check that the request really came from PayMongo
  const raw = await req.text();
  const header = req.headers.get("Paymongo-Signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));

  const expected = await hmacHex(
    Deno.env.get("PAYMONGO_WEBHOOK_SECRET")!,
    `${parts.t}.${raw}`,
  );
  const sigToCheck =
    Deno.env.get("PAYMONGO_MODE") === "live" ? parts.li : parts.te;

  if (!sigToCheck || sigToCheck !== expected) {
    return new Response("Invalid signature", { status: 400 });
  }

  // 2. Only act on "payment paid"
  const event = JSON.parse(raw);
  const type = event?.data?.attributes?.type;

  if (type === "checkout_session.payment.paid") {
    const checkoutId = event.data.attributes.data.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 3. Mark as paid (only if still pending, so no double credit)
       // Which method did the user pay with? (gcash / paymaya)
    const sessionAttrs = event.data.attributes.data.attributes;
    const method =
      sessionAttrs?.payment_method_used ??
      sessionAttrs?.payments?.[0]?.attributes?.source?.type ??
      null;
    console.log("payment method used:", method);

    // 3. Mark as paid (only if still pending, so no double credit)
    const { data: tx, error: txErr } = await admin
      .from("topup_transactions")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
        ...(method ? { payment_method: method } : {}),
      })
      .eq("paymongo_checkout_id", checkoutId)
      .eq("status", "pending")
      .select("id, user_id, credits_added")
      .maybeSingle();

    if (txErr) {
      console.error(txErr);
      return new Response("DB error", { status: 500 });
    }

    // 4. Add the credits to the user
    if (tx) {
      const { data: profile } = await admin
        .from("user_profiles")
        .select("credits_balance")
        .eq("id", tx.user_id)
        .single();

      const { error: balErr } = await admin
        .from("user_profiles")
        .update({
          credits_balance: (profile?.credits_balance ?? 0) + tx.credits_added,
        })
        .eq("id", tx.user_id);

      if (balErr) {
        console.error(balErr);
        // put it back to pending so PayMongo's retry can try again
        await admin
          .from("topup_transactions")
          .update({ status: "pending" })
          .eq("id", tx.id);
        return new Response("DB error", { status: 500 });
      }
    }
  }

  return new Response("ok", { status: 200 });
});
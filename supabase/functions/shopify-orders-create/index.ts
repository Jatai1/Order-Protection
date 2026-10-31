// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: ["none"] }, async (req, ctx) => {
    const rawBody = await req.text();

    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

    const secret = Deno.env.get("SHOPIFY_API_SECRET");

    const webhookHeader = req.headers.get("x-shopify-webhook-id");

    const topicHeader = req.headers.get("x-shopify-topic");

    const shopDomainHeader = req.headers.get("x-shopify-shop-domain");

    if (!hmacHeader) return new Response("Unauthorized", { status: 401 });

    if (!secret) return new Response("Server Misconfigured", { status: 500 });

    const ok = await verifyShopifyHmac(rawBody, hmacHeader, secret);
    if (!ok) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!webhookHeader) return new Response("Bad Request", { status: 400 });

    if (!topicHeader) return new Response("Bad Request", { status: 400 });

    if (!shopDomainHeader) return new Response("Bad Request", { status: 400 });

    const order = JSON.parse(rawBody);

    const { error } = await ctx.supabaseAdmin.from("webhook_events")
      .insert({
        webhook_id: webhookHeader,
        topic: topicHeader,
        shop_domain: shopDomainHeader,
        payload: order,
      });

    if (error) {
      if (error.code !== "23505") {
        return new Response("Error", { status: 500 });
      }
    }

    const protection = order.line_items?.find(
      (item: { sku: string | null }) => item.sku === "ORDER-PROTECTION",
    );

    if (!protection) {
      return new Response("OK", { status: 200 });
    }

    const { error: orderError } = await ctx.supabaseAdmin.from(
      "protected_orders",
    )
      .insert({
        shop_domain: shopDomainHeader,
        shopify_order_id: String(order.id),
        order_name: order.name,
        premium_amount: protection.price,
        order_total: order.total_price,
        currency: order.currency,
      });

    if (orderError) {
      if (orderError.code === "23505") {
        return new Response("Duplicate", { status: 200 });
      }
      return new Response("Error", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  }),
};

async function verifyShopifyHmac(
  rawBody: string,
  hmacHeader: string,
  secret: string,
): Promise<boolean> {
  const bodyBytes = new TextEncoder().encode(rawBody);

  const secretBytes = new TextEncoder().encode(secret);

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, bodyBytes);

  const convertBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  );
  return hmacHeader === convertBase64;
}

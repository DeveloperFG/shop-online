import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;


/** Stripe às vezes envia subscription como string id ou objeto expandido. */
function subscriptionIdFromField(
  raw: string | Stripe.Subscription | null | undefined
): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && "id" in raw && typeof raw.id === "string") {
    return raw.id;
  }
  return null;
}

function customerIdFromField(
  raw: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && "id" in raw && typeof raw.id === "string") {
    return raw.id;
  }
  return null;
}

function productIdFromStripeSubscription(
  subscription: Stripe.Subscription
): string | null {
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  const rawProduct = price?.product;
  if (typeof rawProduct === "string") return rawProduct;
  if (
    rawProduct &&
    typeof rawProduct === "object" &&
    "id" in rawProduct &&
    typeof (rawProduct as { id: string }).id === "string"
  ) {
    return (rawProduct as { id: string }).id;
  }
  return null;
}



function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription
): string | null {

  // tentativa principal
  if (
    subscription.current_period_end &&
    typeof subscription.current_period_end === "number"
  ) {
    return new Date(
      subscription.current_period_end * 1000
    ).toISOString();
  }

  // fallback
  const item = subscription.items?.data?.[0] as any;

  if (
    item?.current_period_end &&
    typeof item.current_period_end === "number"
  ) {
    return new Date(
      item.current_period_end * 1000
    ).toISOString();
  }

  return null;
}

/** Fim do período atual de cobrança (próxima renovação) — fonte correta no Stripe. */
async function subscriptionEndIso(
  subscriptionId: string
): Promise<string | null> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (!sub.current_period_end) return null;
  return new Date(sub.current_period_end * 1000).toISOString();
}

serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

    const eventId = event.id;

    // verifica se já foi processado
    const { data: existingEvent } = await supabase
      .from("stripe_events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();

    if (existingEvent) {
      console.log("Event already processed:", eventId);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // salva evento
    await supabase.from("stripe_events").insert({ id: eventId });
  

  try {
    switch (event.type) {

      // ✅ Checkout concluído — garante linha no Supabase com user_id (metadata)
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const subscriptionId = subscriptionIdFromField(
          session.subscription as string | Stripe.Subscription | null
        );
        const userId = session.metadata?.supabase_user_id?.trim();
        if (!subscriptionId || !userId) {
          console.warn(
            "checkout.session.completed: sem subscription ou supabase_user_id no metadata"
          );
          break;
        }

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        const subscriptionEnd = getSubscriptionPeriodEnd(stripeSub);
        const customerId = customerIdFromField(session.customer);
        const productId = productIdFromStripeSubscription(stripeSub);
        const active =
          stripeSub.status === "active" || stripeSub.status === "trialing";

        const { error: upsertErr } = await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            stripe_product_id: productId,
            is_active: active,
            subscription_end: subscriptionEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" }
        );
        if (upsertErr) {
          console.error("checkout.session.completed upsert:", upsertErr);
        }
        break;
      }

      // ✅ PAGAMENTO OK — usa current_period_end da assinatura (não a 1ª linha do invoice)
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = subscriptionIdFromField(
          invoice.subscription as string | Stripe.Subscription | null
        );
        if (!subscriptionId) break;

        let subscriptionEnd: string | null = null;
        try {
          subscriptionEnd = await subscriptionEndIso(subscriptionId);
        } catch (e) {
          console.error("invoice.payment_succeeded retrieve sub:", e);
        }

        await supabase
          .from("subscriptions")
          .update({
            is_active: true,
            subscription_end: subscriptionEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        break;
      }

      // ❌ PAGAMENTO FALHOU
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = subscriptionIdFromField(
          invoice.subscription as string | Stripe.Subscription | null
        );
        if (!subscriptionId) break;

        await supabase
          .from("subscriptions")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        break;
      }

      // 🚫 CANCELAMENTO
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        await supabase
          .from("subscriptions")
          .update({
            is_active: false,
            subscription_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId)

        break;
      }

      // 🔄 ATUALIZAÇÃO
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const subscriptionEnd = getSubscriptionPeriodEnd(subscription);

        const active =
          subscription.status === "active" || subscription.status === "trialing";

        await supabase
          .from("subscriptions")
          .update({
            is_active: active,
            subscription_end: subscriptionEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Webhook handler failed", { status: 500 });
  }
});
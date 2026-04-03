import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

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

      // ✅ PAGAMENTO OK
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        const subscriptionEnd = new Date(
          invoice.lines.data[0].period.end * 1000
        ).toISOString();

        await supabase
          .from("subscriptions")
          .update({
            is_active: true,
            subscription_end: subscriptionEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId)

        break;
      }

      // ❌ PAGAMENTO FALHOU
      case "invoice.payment_failed": {
        const invoice = event.data.object;
       const subscriptionId = invoice.subscription;

        await supabase
          .from("subscriptions")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId)

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
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const subscriptionEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        await supabase
          .from("subscriptions")
          .update({
            is_active: subscription.status === "active",
            subscription_end: subscriptionEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId)

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
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

  try {
    switch (event.type) {

      // ✅ PAGAMENTO OK
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

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
          .eq("stripe_customer_id", customerId);

        break;
      }

      // ❌ PAGAMENTO FALHOU
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await supabase
          .from("subscriptions")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      // 🚫 CANCELAMENTO
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await supabase
          .from("subscriptions")
          .update({
            is_active: false,
            subscription_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      // 🔄 ATUALIZAÇÃO
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

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
          .eq("stripe_customer_id", customerId);

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
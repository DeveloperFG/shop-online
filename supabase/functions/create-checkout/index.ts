import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // 🔐 ENV
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase ENV missing");

    // 🔗 Clients
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 🔐 Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser(token);

    if (userError) throw new Error(userError.message);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // 🔎 Buscar customer no Stripe
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (!customers.data.length) {
      logStep("No Stripe customer found");

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    // 🔎 Buscar assinatura ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;

    let productId: string | null = null;
    let subscriptionEnd: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];

      if (!subscription?.items?.data?.length) {
        throw new Error("Subscription has no items");
      }

      const item = subscription.items.data[0];

      if (!item?.price?.product) {
        throw new Error("Invalid Stripe product data");
      }

      productId = item.price.product as string;
      subscriptionEnd = new Date(
        subscription.current_period_end * 1000
      ).toISOString();

      logStep("Active subscription", {
        productId,
        subscriptionEnd,
      });

      // 🔄 Verifica se já existe no banco
      const { data: existing, error: selectError } = await supabaseClient
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (selectError) {
        throw new Error(`Select error: ${selectError.message}`);
      }

      const subData = {
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_product_id: productId,
        is_active: true,
        subscription_status: "active",
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      };

      logStep("Preparing DB sync", subData);

      if (existing) {
        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update(subData)
          .eq("id", existing.id);

        if (updateError) {
          throw new Error(`Update error: ${updateError.message}`);
        }

        logStep("Subscription updated");
      } else {
        const { error: insertError } = await supabaseClient
          .from("subscriptions")
          .insert(subData);

        if (insertError) {
          throw new Error(`Insert error: ${insertError.message}`);
        }

        logStep("Subscription inserted");
      }
    } else {
      logStep("No active subscription");

      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          is_active: false,
          subscription_status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(`Update inactive error: ${updateError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        product_id: productId,
        subscription_end: subscriptionEnd,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logStep("ERROR", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser(token);

    if (userError)
      throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;

    if (!user?.email)
      throw new Error("User not authenticated or email not available");

    logStep("User authenticated", {
      userId: user.id,
      email: user.email,
    });

    // 🔥 Stripe (removi versão fixa pra evitar incompatibilidade)
    const stripe = new Stripe(stripeKey);

    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");

      return new Response(
        JSON.stringify({
          subscribed: false,
          product_id: null,
          subscription_end: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const customerId = customers.data[0].id;

    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;

    logStep("hasActiveSub", { hasActiveSub });

    let productId: string | null = null;
    let subscriptionEnd: string | null = null;

    if (hasActiveSub && subscriptions.data[0]) {
      const subscription = subscriptions.data[0];

      logStep("Stripe subscription", subscription);

      // ✅ PROTEÇÃO DO current_period_end
      const periodEnd = subscription.current_period_end;

      if (periodEnd && typeof periodEnd === "number") {
        subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      } else {
        logStep("Invalid period_end", subscription);
        subscriptionEnd = null;
      }

      // ✅ PROTEÇÃO DO product
      const item = subscription.items?.data?.[0];
      productId = item?.price?.product ?? null;

      logStep("Active subscription processed", {
        subscriptionEnd,
        productId,
      });

      // 🔄 Sync com banco
      const { data: existing, error: existingError } = await supabaseClient
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) {
        throw new Error(`Fetch existing error: ${existingError.message}`);
      }

      const subData = {
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_product_id: productId,
        is_active: true,
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update(subData)
          .eq("id", existing.id);

        if (updateError) {
          throw new Error(`Update error: ${updateError.message}`);
        }
      } else {
        const { error: insertError } = await supabaseClient
          .from("subscriptions")
          .insert(subData);

        if (insertError) {
          throw new Error(`Insert error: ${insertError.message}`);
        }
      }
    } else {
      logStep("No active subscription");

      // 🔄 Marca como inativo
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          is_active: false,
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
    console.error("FULL ERROR:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logStep("ERROR", { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
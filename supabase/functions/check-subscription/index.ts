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


function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription
): string | null {

  // tenta pelo objeto principal
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

    const premiumProductId = (Deno.env.get("STRIPE_PRODUCT_ID_PREMIUM") ?? "").trim();
    const enterpriseProductId = (Deno.env.get("STRIPE_PRODUCT_ID_ENTERPRISE") ?? "").trim();
    const premiumPriceId = (Deno.env.get("STRIPE_PRICE_PREMIUM") ?? "").trim();
    const enterprisePriceId = (Deno.env.get("STRIPE_PRICE_ENTERPRISE") ?? "").trim();

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
          cancel_at_period_end: false,
          plan_tier: "free",
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
      status: "all",
      limit: 20,
    });

    const subscription = subscriptions.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );
    const hasActiveSub = Boolean(subscription);

    logStep("hasActiveSub", { hasActiveSub });

    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let cancelAtPeriodEnd = false;
    let planTier: "free" | "premium" | "enterprise" = "free";

    if (hasActiveSub && subscription) {

      const stripeSubId = subscription.id;
      cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

      logStep("Stripe subscription", subscription);

      subscriptionEnd = getSubscriptionPeriodEnd(subscription);

      const item = subscription.items?.data?.[0];
      const price = item?.price;
      const priceId = price?.id ? String(price.id) : null;
      const rawProduct = price?.product;
      if (typeof rawProduct === "string") {
        productId = rawProduct;
      } else if (
        rawProduct &&
        typeof rawProduct === "object" &&
        "id" in rawProduct
      ) {
        productId = (rawProduct as { id: string }).id;
      } else {
        productId = null;
      }

      if (enterpriseProductId && productId === enterpriseProductId) {
        planTier = "enterprise";
      } else if (premiumProductId && productId === premiumProductId) {
        planTier = "premium";
      } else if (enterprisePriceId && priceId === enterprisePriceId) {
        planTier = "enterprise";
      } else if (premiumPriceId && priceId === premiumPriceId) {
        planTier = "premium";
      } else {
        planTier = "premium";
        logStep("Unmatched product/price; defaulting to premium", {
          productId,
          priceId,
          enterpriseProductId: enterpriseProductId || "(not set)",
          premiumProductId: premiumProductId || "(not set)",
        });
      }

      logStep("Active subscription processed", {
        subscriptionEnd,
        productId,
        priceId,
        planTier,
      });

      // 🔄 Sync com banco
      const { data: existing, error: existingError } = await supabaseClient
        .from("subscriptions")
        .select("id")
        .eq("stripe_subscription_id", stripeSubId)
        .maybeSingle();

      if (existingError) {
        throw new Error(`Fetch existing error: ${existingError.message}`);
      }

      const subData = {
        user_id: user.id,
        stripe_subscription_id: stripeSubId,
        stripe_customer_id: customerId,
        stripe_product_id: productId,
        is_active: true,
        subscription_end: subscriptionEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabaseClient
          .from("subscriptions")
          .upsert(subData, {
            onConflict: "stripe_subscription_id",
          });

        if (upsertError) {
          throw new Error(`Upsert error: ${upsertError.message}`);
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
        cancel_at_period_end: hasActiveSub ? cancelAtPeriodEnd : false,
        plan_tier: hasActiveSub ? planTier : "free",
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
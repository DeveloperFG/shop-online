import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface SubscriptionInfo {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  plan_tier: "free" | "premium" | "enterprise";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  subscription: SubscriptionInfo;
  checkingSubscription: boolean;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  subscription: {
    subscribed: false,
    product_id: null,
    subscription_end: null,
    plan_tier: "free",
  },
  checkingSubscription: false,
  refreshSubscription: async () => { },
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

const STRIPE_PRODUCT_ID_PREMIUM = (
  import.meta.env.VITE_STRIPE_PRODUCT_ID_PREMIUM as string | undefined
)?.trim() ?? "";

const STRIPE_PRODUCT_ID_ENTERPRISE = (
  import.meta.env.VITE_STRIPE_PRODUCT_ID_ENTERPRISE as string | undefined
)?.trim() ?? "";


function planTierFromProductAndResponse(data: {
  subscribed?: boolean;
  product_id?: string | null;
  plan_tier?: string | null;
}): "free" | "premium" | "enterprise" {
  const subscribed = data.subscribed ?? false;
  if (!subscribed) return "free";

  const productId = data.product_id ? String(data.product_id).trim() : null;

  if (
    STRIPE_PRODUCT_ID_ENTERPRISE &&
    productId === STRIPE_PRODUCT_ID_ENTERPRISE
  ) {
    return "enterprise";
  }

  if (
    STRIPE_PRODUCT_ID_PREMIUM &&
    productId === STRIPE_PRODUCT_ID_PREMIUM
  ) {
    return "premium";
  }

  const t = data.plan_tier;
  if (t === "free" || t === "premium" || t === "enterprise") return t;

  return subscribed ? "premium" : "free";
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const banCheckGen = useRef(0);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    product_id: null,
    subscription_end: null,
    plan_tier: "free",
  });

  const [checkingSubscription, setCheckingSubscription] = useState(false);

  const checkBanned = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("banned_users")
      .select("id, reason, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      sessionStorage.setItem("ban_info", JSON.stringify(data));

      if (window.location.pathname !== "/banido") {
        window.location.replace("/banido");
      }

      await supabase.auth.signOut();
      return true;
    }

    return false;
  };

  const checkSubscription = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      setCheckingSubscription(true);

      const { data, error } = await supabase.functions.invoke(
        "check-subscription",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        console.error("check-subscription failed:", error);
        return;
      }

      if (data) {
        // 🔥 CORREÇÃO AQUI
        const resolvedPlan = planTierFromProductAndResponse({
          subscribed: data.subscribed,
          product_id: data.product_id,
          plan_tier: data.plan_tier,
        });

        setSubscription({
          subscribed: data.subscribed ?? false,
          product_id: data.product_id ?? null,
          subscription_end: data.subscription_end ?? null,
          plan_tier: resolvedPlan,
        });
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
    } finally {
      setCheckingSubscription(false);
    }
  };

  useEffect(() => {
    const runBanCheck = (userId: string, deferred: boolean) => {
      const gen = ++banCheckGen.current;

      setLoading(true);

      const go = () => {
        void checkBanned(userId).then((banned) => {
          if (gen !== banCheckGen.current) return;
          if (banned) return;

          checkSubscription();
          setLoading(false);
        });
      };

      if (deferred) setTimeout(go, 0);
      else go();
    };

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        if (event === "TOKEN_REFRESHED") return;

        runBanCheck(session.user.id, true);
      } else {
        banCheckGen.current += 1;

        setSubscription({
          subscribed: false,
          product_id: null,
          subscription_end: null,
          plan_tier: "free",
        });

        setLoading(false);
      }
    });

    const interval = setInterval(() => {
      if (user) checkSubscription();
    }, 60000);

    return () => {
      authSub.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();

    setUser(null);

    setSubscription({
      subscribed: false,
      product_id: null,
      subscription_end: null,
      plan_tier: "free",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        subscription,
        checkingSubscription,
        refreshSubscription: checkSubscription,
        signOut,
      }}
    >
      {loading ? (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
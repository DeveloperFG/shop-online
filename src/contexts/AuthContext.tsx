import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface SubscriptionInfo {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
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
  subscription: { subscribed: false, product_id: null, subscription_end: null },
  checkingSubscription: false,
  refreshSubscription: async () => { },
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const banCheckGen = useRef(0);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    product_id: null,
    subscription_end: null,
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
      void supabase.auth.signOut();
      return true;
    }
    return false;
  };


  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCheckingSubscription(true);
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },

      });

      if (error) {
        const errText = await error.context.text(); // 👈 ESSENCIAL
        console.error("Function error body:", errText);
      }

      if (!error && data) {
        setSubscription({
          subscribed: data.subscribed ?? false,
          product_id: data.product_id ?? null,
          subscription_end: data.subscription_end ?? null,
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

    // Set up auth listener BEFORE getSession
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          if (event === "TOKEN_REFRESHED") return;
          // Defer to avoid Supabase deadlock when calling from onAuthStateChange
          runBanCheck(session.user.id, true);
        } else {
          banCheckGen.current += 1;
          setSubscription({ subscribed: false, product_id: null, subscription_end: null });
          setLoading(false);
        }
      }
    );

    // Initial session only comes from onAuthStateChange (INITIAL_SESSION).
    // Avoid getSession() here: it can resolve null before storage sync and briefly set loading false → route flash.

    // Auto-refresh every 60s
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
    setSubscription({ subscribed: false, product_id: null, subscription_end: null });
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, subscription, checkingSubscription, refreshSubscription: checkSubscription, signOut }}
    >
      {loading ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

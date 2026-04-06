import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    product_id: null,
    subscription_end: null,
  });
  const [checkingSubscription, setCheckingSubscription] = useState(false);

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
    // Set up auth listener BEFORE getSession
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          // Defer to avoid Supabase deadlock
          setTimeout(() => checkSubscription(), 0);
        } else {
          setSubscription({ subscribed: false, product_id: null, subscription_end: null });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) checkSubscription();
    });

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
      {children}
    </AuthContext.Provider>
  );
};

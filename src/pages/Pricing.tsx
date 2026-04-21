import { Check, X, Crown, Zap, Loader2, Building2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const features = [
  { name: "Cadastrar produtos", free: true, premium: true, enterprise: true },
  { name: "Limite de produtos", free: "3 produtos", premium: "Ilimitado", enterprise: "Ilimitado" },
  { name: "Fotos dos produtos", free: true, premium: true, enterprise: true },
  { name: "Perfil público", free: true, premium: true, enterprise: true },
  { name: "Avaliações e reputação", free: true, premium: true, enterprise: true },
  { name: "Suporte prioritário por e-mail", free: false, premium: true, enterprise: true },
  { name: "Suporte dedicado e onboarding", free: false, premium: false, enterprise: true },
];

const Pricing = () => {
  const [loading, setLoading] = useState<"premium" | "enterprise" | null>(null);
  const navigate = useNavigate();
  const { user, subscription, checkingSubscription, refreshSubscription } = useAuth();

  const isPremiumActive =
    Boolean(user && subscription.subscribed && subscription.plan_tier === "premium");
  const isEnterpriseActive =
    Boolean(user && subscription.subscribed && subscription.plan_tier === "enterprise");
  const isFreeActive = Boolean(user && !subscription.subscribed);


  useEffect(() => {
    if (user) void refreshSubscription();
    // refreshSubscription vem do contexto; id do usuário basta para revalidar ao trocar conta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCheckout = async (plan: "premium" | "enterprise") => {
    setLoading(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { plan },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Zap className="w-3 h-3 mr-1" /> Planos
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
            Escolha o plano ideal para você
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece gratuitamente e faça upgrade quando precisar de mais recursos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* Free Plan */}
          <Card
            className={`relative border-border transition-shadow ${isFreeActive ? "ring-2 ring-primary shadow-md" : ""
              }`}
          >
            {isFreeActive && (
              <div className="absolute -top-3 right-4">
                <Badge variant="default" className="shadow-sm">
                  Plano ativo
                </Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-foreground">Grátis</CardTitle>
              <CardDescription>Para quem está começando</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">R$ 0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((f) => (
                <div key={f.name} className="flex items-center gap-3">
                  {f.free ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={f.free ? "text-foreground text-sm" : "text-muted-foreground/60 text-sm"}>
                    {typeof f.free === "string" ? `${f.name} (${f.free})` : f.name}
                  </span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              {checkingSubscription && user ? (
                <Button variant="outline" className="w-full" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando plano…
                </Button>
              ) : isFreeActive ? (
                <Button variant="outline" className="w-full" disabled>
                  Plano atual
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  {user ? "Grátis" : "Grátis ao criar conta"}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Premium Plan */}
          <Card
            className={`relative border-primary shadow-lg transition-shadow ${isPremiumActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "ring-2 ring-primary/20"
              }`}
          >
            <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
              {isPremiumActive ? (
                <Badge className="bg-primary text-primary-foreground shadow-sm">
                  Plano ativo
                </Badge>
              ) : (
                <Badge className="bg-primary text-primary-foreground shadow-sm">
                  <Crown className="w-3 h-3 mr-1" /> Recomendado
                </Badge>
              )}
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-foreground">Premium Usuario</CardTitle>
              <CardDescription>Aumente suas vendas com mais recursos </CardDescription>
              {isPremiumActive && subscription.subscription_end && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Renova em{" "}
                  {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
                </p>
              )}
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">R$ 9,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((f) => (
                <div key={f.name} className="flex items-center gap-3">
                  {f.premium ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={f.premium ? "text-foreground text-sm" : "text-muted-foreground/60 text-sm"}>
                    {typeof f.premium === "string" ? `${f.name} (${f.premium})` : f.name}
                  </span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              {checkingSubscription && user ? (
                <Button className="w-full" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando plano…
                </Button>
              ) : isPremiumActive ? (
                <Button className="w-full" disabled variant="secondary">
                  Plano ativo
                </Button>
              ) : isEnterpriseActive ? (
                <Button className="w-full" disabled variant="outline">
                  Incluído no Enterprise
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => void handleCheckout("premium")}
                  disabled={loading !== null}
                >
                  {loading === "premium" ? "Redirecionando..." : "Assinar Premium"}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Premium Enterprise */}
          <Card
            className={`relative border-amber-500/40 shadow-md transition-shadow ${isEnterpriseActive
              ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-background"
              : "ring-1 ring-amber-500/25"
              }`}
          >
            <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
              {isEnterpriseActive ? (
                <Badge className="bg-amber-600 text-white hover:bg-amber-600 shadow-sm">
                  Plano ativo
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400 shadow-sm">
                  <Rocket className="w-3 h-3 mr-1" /> Enterprise
                </Badge>
              )}
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-foreground">Premium Enterprise</CardTitle>
              <CardDescription>Máximo de recursos e suporte para escalar</CardDescription>
              {isEnterpriseActive && subscription.subscription_end && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Renova em{" "}
                  {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
                </p>
              )}
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">R$ 14,99</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((f) => (
                <div key={f.name} className="flex items-center gap-3">
                  {f.enterprise ? (
                    <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={f.enterprise ? "text-foreground text-sm" : "text-muted-foreground/60 text-sm"}>
                    {typeof f.enterprise === "string" ? `${f.name} (${f.enterprise})` : f.name}
                  </span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              {checkingSubscription && user ? (
                <Button className="w-full bg-amber-600 hover:bg-amber-700" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando plano…
                </Button>
              ) : isEnterpriseActive ? (
                <Button className="w-full bg-amber-600 hover:bg-amber-700" disabled variant="secondary">
                  Plano ativo
                </Button>
              ) : (
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => void handleCheckout("enterprise")}
                  disabled={loading !== null}
                >
                  {loading === "enterprise" ? "Redirecionando..." : "Assinar Enterprise"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
};

export default Pricing;

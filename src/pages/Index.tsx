import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { ArrowRight, Package, Shield, Star } from "lucide-react";

const features = [
  { icon: Package, title: "Gerencie Produtos", desc: "Cadastre e organize seus produtos com facilidade." },
  { icon: Shield, title: "Seguro & Confiável", desc: "Seus dados protegidos com autenticação robusta." },
  { icon: Star, title: "Plano Premium", desc: "Desbloqueie recursos ilimitados com o plano premium." },
];

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-4 pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
            ✨ Anuncie seus produtos novos e usados
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Gerencie seus produtos de forma{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              simples e eficiente
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Cadastre, organize e compartilhe seus produtos com praticidade.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to={user ? "/dashboard" : "/auth"}>
                {user ? "Ir ao Dashboard" : "Começar Grátis"} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/pricing">Ver Planos</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            Tudo que você precisa
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Ferramentas completas para gerenciar seus produtos em um só lugar.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <h2 className="text-2xl font-bold text-card-foreground sm:text-3xl">Pronto para começar?</h2>
          <p className="mt-3 text-muted-foreground">Crie sua conta gratuitamente e comece a gerenciar seus produtos agora.</p>
          <Button asChild size="lg" className="mt-6">
            <Link to={user ? "/dashboard" : "/auth"}>
              {user ? "Acessar Dashboard" : "Criar Conta Grátis"} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} FSolutions - Todos os direitos reservados.</span>
          {/* <div className="flex gap-6">
            <Link to="/pricing" className="hover:text-foreground">Preços</Link>
            <Link to="/auth" className="hover:text-foreground">Login</Link>
          </div> */}
        </div>
      </footer>
    </div>
  );
};

export default Index;

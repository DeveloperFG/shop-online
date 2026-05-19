import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { toast } from "sonner";
import { Lock } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const handleRecovery = async () => {
      try {
        /**
         * O cliente Supabase (detectSessionInUrl: true) processa o hash ou ?code=
         * durante a inicialização; getSession() aguarda isso antes de devolver dados.
         * O AuthProvider segura as rotas com loading inicial, então este componente
         * costuma montar depois do URL já estar limpo — não dá para depender só do
         * fragment.
         */
        const firstSessionTry =
          await supabase.auth.getSession();

        if (firstSessionTry.data.session) {
          setReady(true);

          const hasAuthParams =
            Boolean(
              window.location.hash
            ) ||
            window.location.search.includes(
              "code="
            );

          if (
            hasAuthParams
          ) {
            window.history.replaceState(
              {},
              "",
              window.location.pathname
            );
          }

          setChecking(false);
          return;
        }

        const hash =
          window.location.hash;

        if (hash) {
          const hashParams =
            new URLSearchParams(hash.substring(1));

          const access_token =
            hashParams.get(
              "access_token"
            );
          const refresh_token =
            hashParams.get(
              "refresh_token"
            );
          const type =
            hashParams.get("type");

          if (
            type === "recovery" &&
            access_token &&
            refresh_token
          ) {
            const { error } =
              await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

            if (error) {
              console.error(
                "Erro ao restaurar sessão:",
                error
              );
              toast.error(
                "Link inválido ou expirado"
              );

              setChecking(false);
              return;
            }

            setReady(true);
            setChecking(false);
            return;
          }
        }

        const pkceCode =
          new URLSearchParams(
            window.location.search
          ).get("code");

        if (pkceCode) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              pkceCode
            );

          if (error) {
            console.error(
              "Erro ao trocar código PKCE:",
              error
            );
            toast.error(
              "Link inválido ou expirado"
            );
          } else {
            setReady(true);
            window.history.replaceState(
              {},
              "",
              window.location.pathname
            );
          }
        }

        setChecking(false);
      } catch (err) {
        console.error(err);
        toast.error(
          "Erro ao validar link"
        );
        setChecking(false);
      }
    };

    handleRecovery();
  }, []);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error(
        "A senha deve ter pelo menos 6 caracteres"
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) throw error;

      toast.success(
        "Senha atualizada com sucesso!"
      );

      navigate("/auth");
    } catch (err: any) {
      toast.error(
        err.message || "Erro ao atualizar senha"
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>
              Validando link...
            </CardTitle>

            <CardDescription>
              Aguarde um momento
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>
              Link inválido
            </CardTitle>

            <CardDescription>
              Este link de recuperação é inválido
              ou expirou.
            </CardDescription>
          </CardHeader>

          <CardFooter className="justify-center">
            <Button
              onClick={() => navigate("/auth")}
            >
              Voltar ao login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Nova senha
          </CardTitle>

          <CardDescription>
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">
                Nova senha
              </Label>

              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="pl-9"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  minLength={6}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? "Atualizando..."
                : "Atualizar senha"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
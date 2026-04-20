import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Mail } from "lucide-react";

const SUPPORT_EMAIL = "engineer.fernando.gustavo@gmail.com";

const Banned = () => {
    const navigate = useNavigate();
    const [reason, setReason] = useState<string | null>(null);
    const [bannedAt, setBannedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const stored = sessionStorage.getItem("ban_info");
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setReason(parsed.reason ?? null);
                    setBannedAt(parsed.created_at ?? null);
                } catch { }
            }

            // Try to fetch fresh data if a session still exists
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase
                    .from("banned_users")
                    .select("reason, created_at")
                    .eq("user_id", session.user.id)
                    .maybeSingle();
                if (data) {
                    setReason(data.reason);
                    setBannedAt(data.created_at);
                    sessionStorage.setItem("ban_info", JSON.stringify(data));
                }
                // Make sure the banned user is logged out
                await supabase.auth.signOut();
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleBack = () => {
        sessionStorage.removeItem("ban_info");
        navigate("/auth");
    };

    const handleContactSupport = () => {
        const subject = encodeURIComponent("Conta bloqueada - Solicitação de revisão");
        const body = encodeURIComponent(
            `Olá, equipe de suporte.\n\nMinha conta foi bloqueada na plataforma e gostaria de solicitar uma revisão.\n\nMotivo informado: ${reason || "Não informado"}\nData do bloqueio: ${bannedAt ? new Date(bannedAt).toLocaleString("pt-BR") : "Não informada"}\n\nPor favor, me ajudem a entender e resolver essa situação.\n\nObrigado.`
        );
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md text-center border-destructive/50">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                        <ShieldAlert className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">Conta bloqueada</CardTitle>
                    <CardDescription>
                        Sua conta foi bloqueada por um administrador e o acesso à plataforma foi suspenso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left">
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Motivo</p>
                        <p className="text-sm">
                            {loading ? "Carregando..." : reason || "Nenhum motivo informado."}
                        </p>
                    </div>
                    {bannedAt && (
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Data do bloqueio</p>
                            <p className="text-sm">{new Date(bannedAt).toLocaleString("pt-BR")}</p>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center pt-2">
                        Se você acredita que isso foi um engano, entre em contato com o suporte.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button onClick={handleContactSupport} className="w-full gap-2">
                        <Mail className="h-4 w-4" />
                        Entrar em contato com o suporte
                    </Button>
                    <Button onClick={handleBack} variant="outline" className="w-full">
                        Voltar ao login
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Banned;
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TermsModal, { TERMS_VERSION } from "@/components/TermsModal";

/**
 * Gate global de aceitação dos Termos de Uso.
 *
 * Verifica no banco se o usuário logado já aceitou a versão atual dos termos.
 * Enquanto não aceitar, o modal é exibido em qualquer página do site — mesmo
 * que ele saia e volte. Só deixa de aparecer após o aceite ser registrado.
 */
const TermsGate = () => {
    const { user, loading } = useAuth();
    const [accepted, setAccepted] = useState<boolean | null>(null);

    useEffect(() => {
        let active = true;

        const checkAcceptance = async () => {
            if (!user) {
                setAccepted(null);
                return;
            }

            const { data, error } = await supabase
                .from("user_terms_acceptance")
                .select("id")
                .eq("user_id", user.id)
                .eq("terms_version", TERMS_VERSION)
                .maybeSingle();

            if (!active) return;

            if (error) {
                console.error("Erro ao verificar aceite dos termos:", error);
                return;
            }

            setAccepted(Boolean(data));
        };

        checkAcceptance();

        return () => {
            active = false;
        };
    }, [user]);

    if (loading || !user || accepted !== false) return null;

    return <TermsModal user={user} onAccept={() => setAccepted(true)} />;
};

export default TermsGate;

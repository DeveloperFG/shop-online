import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TERMS_VERSION = "v1.0";

const TermsModal = ({ user, onAccept }: any) => {
    const [checked, setChecked] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        if (!checked) return;
        setLoading(true);
        await supabase.from("user_terms_acceptance").insert({
            user_id: user.id,
            terms_version: TERMS_VERSION,
        });
        setLoading(false);
        onAccept();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5 text-white text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">Termos de Uso</h2>
                    <p className="text-blue-100 text-xs mt-1">Versão {TERMS_VERSION}</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-5">
                    <p className="text-sm text-gray-600 text-center leading-relaxed">
                        Para continuar utilizando a plataforma, é necessário ler e aceitar
                        os nossos <span className="font-medium text-gray-800">Termos de Uso e Política de Privacidade</span>.
                    </p>

                    {/* Read Terms Button */}
                    <button
                        onClick={() => window.open("/accept-terms", "_blank")}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-blue-100 bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 hover:border-blue-200 transition-all duration-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Ler os Termos de Uso completos
                    </button>

                    {/* Checkbox */}
                    <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${checked
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}>
                        <div className="relative flex-shrink-0 mt-0.5">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setChecked(e.target.checked)}
                                className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all duration-200 ${checked ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                                }`}>
                                {checked && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <span className={`text-sm leading-relaxed transition-colors duration-200 ${checked ? "text-blue-800 font-medium" : "text-gray-600"
                            }`}>
                            Declaro que li e concordo com os <span className="font-semibold">Termos de Uso</span> e a{" "}
                            <span className="font-semibold">Política de Privacidade</span> da plataforma.
                        </span>
                    </label>

                    {/* Accept Button */}
                    <button
                        onClick={handleAccept}
                        disabled={!checked || loading}
                        className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${checked && !loading
                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                    >
                        {loading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Aceitar e continuar
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 text-center">
                    <p className="text-xs text-gray-400">
                        Ao aceitar, você confirma ter pelo menos 18 anos e concordar com nossas políticas.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default TermsModal;

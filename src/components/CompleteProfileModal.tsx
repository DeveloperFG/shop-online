import { useNavigate } from "react-router-dom";

const CompleteProfileModal = ({ onClose }: { onClose?: () => void }) => {
    const navigate = useNavigate();

    const handleComplete = () => {
        navigate("/profile");
        onClose?.();
    };

    const CloseModal = () => {
        onClose?.();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-5 text-white text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">Perfil Incompleto</h2>
                    <p className="text-amber-100 text-xs mt-1">Ação necessária</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-5">

                    {/* Message Card */}
                    <div className="flex gap-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-100">
                        <div className="flex-shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </div>
                        <p className="text-sm text-amber-800 leading-relaxed">
                            Você ainda não terminou de preencher seus{" "}
                            <span className="font-semibold">dados pessoais</span>. Complete seu perfil para
                            aproveitar todos os recursos da plataforma.
                        </p>
                    </div>

                    {/* Buttons */}
                    <button
                        onClick={handleComplete}
                        className="w-full py-3.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Completar meus dados agora
                    </button>

                    <button
                        onClick={CloseModal}
                        className="w-full py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
                    >
                        Fazer isso depois
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 text-center">
                    <p className="text-xs text-gray-400">
                        Perfis completos geram mais confiança entre compradores e vendedores.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default CompleteProfileModal;

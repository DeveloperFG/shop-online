import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserRanking {
    user_id: string;
    name: string;
    avatar_url?: string;
    total_reviews: number;
    average_rating: number;
}

const getRankBadge = (position: number) => {
    if (position === 1) return { emoji: "🥇", color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200" };
    if (position === 2) return { emoji: "🥈", color: "text-gray-400", bg: "bg-gray-50 border-gray-200" };
    if (position === 3) return { emoji: "🥉", color: "text-orange-400", bg: "bg-orange-50 border-orange-200" };
    return { emoji: null, color: "text-gray-400", bg: "bg-white border-gray-100" };
};

const getStarColor = (rating: number) => {
    if (rating >= 4.5) return "text-yellow-400";
    if (rating >= 3.5) return "text-yellow-300";
    if (rating >= 2.5) return "text-orange-300";
    return "text-red-300";
};

const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return { label: "Excelente", color: "bg-green-100 text-green-700" };
    if (rating >= 3.5) return { label: "Muito Bom", color: "bg-blue-100 text-blue-700" };
    if (rating >= 2.5) return { label: "Regular", color: "bg-yellow-100 text-yellow-700" };
    return { label: "Fraco", color: "bg-red-100 text-red-700" };
};

const StarRating = ({ rating }: { rating: number }) => {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = rating >= star;
                const half = !filled && rating >= star - 0.5;
                return (
                    <svg
                        key={star}
                        className={`w-3.5 h-3.5 ${filled || half ? getStarColor(rating) : "text-gray-200"}`}
                        fill={filled ? "currentColor" : half ? "url(#half)" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {half && (
                            <defs>
                                <linearGradient id="half">
                                    <stop offset="50%" stopColor="currentColor" />
                                    <stop offset="50%" stopColor="transparent" />
                                </linearGradient>
                            </defs>
                        )}
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                    </svg>
                );
            })}
        </div>
    );
};

const UserRankingModal = ({ onClose }: { onClose: () => void }) => {
    const [ranking, setRanking] = useState<UserRanking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRanking = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch all reviews with reviewer info
            const { data: reviews, error: reviewsError } = await supabase
                .from("reviews")
                .select("reviewed_user_id, rating");

            if (reviewsError) throw reviewsError;

            // Aggregate by user
            const aggregated: Record<string, { total: number; sum: number }> = {};
            for (const review of reviews ?? []) {
                const uid = review.reviewed_user_id;
                if (!aggregated[uid]) aggregated[uid] = { total: 0, sum: 0 };
                aggregated[uid].total += 1;
                aggregated[uid].sum += review.rating;
            }

            const userIds = Object.keys(aggregated);
            if (userIds.length === 0) {
                setRanking([]);
                setLoading(false);
                return;
            }

            // Fetch profiles
            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, name, avatar_url")
                .in("id", userIds);

            if (profilesError) throw profilesError;

            const result: UserRanking[] = (profiles ?? []).map((profile) => {
                const stats = aggregated[profile.id];
                return {
                    user_id: profile.id,
                    name: profile.name || "Usuário",
                    avatar_url: profile.avatar_url,
                    total_reviews: stats.total,
                    average_rating: parseFloat((stats.sum / stats.total).toFixed(1)),
                };
            });

            // Sort: first by average_rating desc, then by total_reviews desc
            result.sort((a, b) =>
                b.average_rating !== a.average_rating
                    ? b.average_rating - a.average_rating
                    : b.total_reviews - a.total_reviews
            );

            setRanking(result);
        } catch (err: any) {
            setError("Não foi possível carregar o ranking. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRanking();
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-5 text-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold tracking-tight">Ranking de Usuários</h2>
                                <p className="text-blue-100 text-xs mt-0.5">Classificado por avaliações e nota média</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Criteria Legend */}
                {/* <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
                    <div className="flex flex-wrap gap-3 text-xs text-blue-700">
                        <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Critérios: nota média (principal) + nº de avaliações (desempate)
                        </span>
                    </div>
                </div> */}

                {/* Content */}
                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <p className="text-sm text-gray-400">Carregando ranking...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500 text-center">{error}</p>
                            <button
                                onClick={fetchRanking}
                                className="text-xs text-blue-600 hover:underline font-medium"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : ranking.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-400">Nenhum usuário avaliado ainda.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50 px-4 py-3 space-y-2">
                            {ranking.map((user, index) => {
                                const position = index + 1;
                                const badge = getRankBadge(position);
                                const ratingLabel = getRatingLabel(user.average_rating);
                                const initials = user.name
                                    .split(" ")
                                    .slice(0, 2)
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase();

                                return (
                                    <li
                                        key={user.user_id}
                                        className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${badge.bg} ${position <= 3 ? "shadow-sm" : ""
                                            }`}
                                    >
                                        {/* Position */}
                                        <div className="flex-shrink-0 w-8 text-center">
                                            {badge.emoji ? (
                                                <span className="text-xl">{badge.emoji}</span>
                                            ) : (
                                                <span className={`text-sm font-bold ${badge.color}`}>#{position}</span>
                                            )}
                                        </div>

                                        {/* Avatar */}
                                        <div className="flex-shrink-0">
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt={user.name}
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm border-2 border-white">
                                                    {initials}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <StarRating rating={user.average_rating} />
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {user.total_reviews} {user.total_reviews === 1 ? "avaliação" : "avaliações"}
                                            </span>
                                        </div>

                                        {/* Score */}
                                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                            <span className="text-lg font-bold text-gray-800">{user.average_rating.toFixed(1)}</span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ratingLabel.color}`}>
                                                {ratingLabel.label}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                    <p className="text-xs text-gray-400">
                        {ranking.length > 0 ? `${ranking.length} ${ranking.length == 1 ? "usuario" : "usuarios"} ${ranking.length == 1 ? "listado" : "listados"}` : ""}
                    </p>
                    {/* <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all duration-200"
                    >
                        Fechar
                    </button> */}
                </div>

            </div>
        </div>
    );
};

export default UserRankingModal;

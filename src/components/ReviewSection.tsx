import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, Loader2, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Review = Tables<"reviews">;

interface ReviewWithProfile extends Review {
  reviewer_name?: string;
}

interface ReviewSectionProps {
  sellerId: string;
  productId: string;
}

const StarRating = ({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readonly}
        className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        onClick={() => onChange?.(star)}
      >
        <Star
          className={`h-5 w-5 ${star <= value
              ? "fill-primary text-primary"
              : "text-muted-foreground/30"
            }`}
        />
      </button>
    ))}
  </div>
);

const ReviewSection = ({ sellerId, productId }: ReviewSectionProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const isOwnProduct = user?.id === sellerId;

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("reviewed_user_id", sellerId)
      .order("created_at", { ascending: false });

    if (!data) {
      setLoading(false);
      return;
    }

    // Fetch reviewer names
    const reviewerIds = [...new Set(data.map((r) => r.reviewer_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", reviewerIds);

    const nameMap = new Map(profiles?.map((p) => [p.user_id, p.name]) ?? []);

    setReviews(
      data.map((r) => ({ ...r, reviewer_name: nameMap.get(r.reviewer_id) ?? "Usuário" }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [sellerId]);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast({ title: "Selecione uma nota de 1 a 5", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      rating,
      comment: comment.trim() || null,
      reviewed_user_id: sellerId,
      reviewer_id: user.id,
      product_id: productId,
    });

    if (error) {
      toast({ title: "Erro ao enviar avaliação", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Avaliação enviada!" });
      setRating(0);
      setComment("");
      fetchReviews();
    }
    setSubmitting(false);
  };

  const alreadyReviewed = reviews.some((r) => r.reviewer_id === user?.id);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Avaliações do vendedor ({reviews.length})
      </h2>

      {/* Review form */}
      {user && !isOwnProduct && !alreadyReviewed && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Avaliar vendedor</p>
            <StarRating value={rating} onChange={setRating} />
            <Textarea
              placeholder="Comentário (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={3}
            />
            <Button size="sm" onClick={handleSubmit} disabled={submitting || rating === 0}>
              {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Enviar avaliação
            </Button>
          </CardContent>
        </Card>
      )}

      {alreadyReviewed && (
        <p className="text-sm text-muted-foreground">Você já avaliou este vendedor.</p>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{review.reviewer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <StarRating value={review.rating} readonly />
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2 } from "lucide-react";
import ChatDialog from "./ChatDialog";

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  updated_at: string;
  product_name?: string;
  other_name?: string;
  unread_count?: number;
}

interface ConversationsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ConversationsList = ({ open, onOpenChange }: ConversationsListProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    loadConversations();
  }, [open, user]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (!convs || convs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Get product names and other user names
    const productIds = convs.map((c) => c.product_id).filter(Boolean) as string[];
    const otherUserIds = convs.map((c) =>
      c.buyer_id === user.id ? c.seller_id : c.buyer_id
    );

    const [{ data: products }, { data: profiles }, { data: unreadMessages }] =
      await Promise.all([
        productIds.length > 0
          ? supabase.from("products").select("id, name").in("id", productIds)
          : { data: [] },
        supabase.from("profiles").select("user_id, name").in("user_id", otherUserIds),
        supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", convs.map((c) => c.id))
          .neq("sender_id", user.id)
          .eq("read", false),
      ]);

    const productMap = new Map((products ?? []).map((p) => [p.id, p.name]));
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.name]));

    // Count unread per conversation
    const unreadMap = new Map<string, number>();
    (unreadMessages ?? []).forEach((m) => {
      unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1);
    });

    const enriched = convs.map((c) => ({
      ...c,
      product_name: c.product_id ? productMap.get(c.product_id) ?? "Produto" : "Produto",
      other_name:
        profileMap.get(c.buyer_id === user.id ? c.seller_id : c.buyer_id) ?? "Usuário",
      unread_count: unreadMap.get(c.id) ?? 0,
    }));

    setConversations(enriched);
    setLoading(false);
  };

  const openChat = (conv: Conversation) => {
    setSelectedConv(conv);
    setChatOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-80 sm:w-96 p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Mensagens
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-5rem)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda
              </p>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openChat(conv)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {conv.other_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.product_name}
                      </p>
                    </div>
                    {(conv.unread_count ?? 0) > 0 && (
                      <Badge variant="destructive" className="shrink-0 text-xs px-1.5 py-0.5">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {selectedConv && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={(o) => {
            setChatOpen(o);
            if (!o) {
              loadConversations();
            }
          }}
          conversationId={selectedConv.id}
          sellerId={
            selectedConv.buyer_id === user?.id
              ? selectedConv.seller_id
              : selectedConv.buyer_id
          }
          sellerName={selectedConv.other_name ?? "Usuário"}
          productId={selectedConv.product_id ?? ""}
          productName={selectedConv.product_name ?? "Produto"}
        />
      )}
    </>
  );
};

export default ConversationsList;

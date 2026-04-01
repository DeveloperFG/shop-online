import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  sellerId: string;
  sellerName: string;
  productId: string;
  productName: string;
}

const ChatDialog = ({
  open,
  onOpenChange,
  conversationId: initialConvId,
  sellerId,
  sellerName,
  productId,
  productName,
}: ChatDialogProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState<string | null>(initialConvId);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConvId(initialConvId);
  }, [initialConvId]);

  // Load or create conversation
  useEffect(() => {
    if (!open || !user) return;

    const init = async () => {
      setLoading(true);

      if (convId) {
        await loadMessages(convId);
        await markAsRead(convId);
      } else {
        // Check if conversation exists
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("buyer_id", user.id)
          .eq("seller_id", sellerId)
          .eq("product_id", productId)
          .maybeSingle();

        if (existing) {
          setConvId(existing.id);
          await loadMessages(existing.id);
          await markAsRead(existing.id);
        }
      }
      setLoading(false);
    };

    init();
  }, [open, user, convId]);

  // Realtime subscription
  useEffect(() => {
    if (!convId || !open) return;

    const channel = supabase
      .channel(`messages-${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark as read if we're the recipient
          if (msg.sender_id !== user?.id) {
            supabase
              .from("messages")
              .update({ read: true })
              .eq("id", msg.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [convId, open, user?.id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async (cId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", cId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  };

  const markAsRead = async (cId: string) => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", cId)
      .neq("sender_id", user.id)
      .eq("read", false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);

    let currentConvId = convId;

    if (!currentConvId) {
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          buyer_id: user.id,
          seller_id: sellerId,
          product_id: productId,
        })
        .select("id")
        .single();

      if (error || !conv) {
        setSending(false);
        return;
      }
      currentConvId = conv.id;
      setConvId(conv.id);
    }

    await supabase.from("messages").insert({
      conversation_id: currentConvId,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    setNewMessage("");
    setSending(false);
    await loadMessages(currentConvId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] max-h-[600px] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Chat com {sellerName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">
            Sobre: {productName}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3" ref={scrollRef}>
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Envie uma mensagem para iniciar a conversa
            </p>
          ) : (
            <div className="space-y-2 py-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender_id === user?.id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.sender_id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        msg.sender_id === user?.id
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;

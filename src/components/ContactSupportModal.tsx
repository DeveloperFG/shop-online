import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Destinatário fixo do suporte */
export const SUPPORT_EMAIL = "kali.fsolutions@gmail.com";

const contactFormSchema = z.object({
  name: z.string().min(2, "Informe seu nome (mínimo 2 caracteres)."),
  email: z.string().email("Informe um e-mail válido."),
  subject: z.string().min(3, "Informe um assunto (mínimo 3 caracteres)."),
  message: z.string().min(10, "Descreva sua dúvida ou problema (mínimo 10 caracteres)."),
});

export type ContactSupportFormValues = z.infer<typeof contactFormSchema>;

interface ContactSupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-preenche o e-mail quando o usuário está autenticado */
  defaultEmail?: string | null;
  defaultName?: string | null;
}

const ContactSupportModal = ({ open, onOpenChange, defaultEmail, defaultName }: ContactSupportModalProps) => {
  const form = useForm<ContactSupportFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: defaultName?.trim() ?? "",
      email: defaultEmail?.trim() ?? "",
      subject: "",
      message: "",
    });
  }, [open, defaultEmail, defaultName, form]);

  function onSubmit(values: ContactSupportFormValues) {
    const bodyLines = [
      `Nome: ${values.name}`,
      `E-mail para resposta: ${values.email}`,
      "",
      values.message,
    ];
    const body = bodyLines.join("\n");
    const subject = `[Suporte QXB] ${values.subject}`;
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      window.location.href = mailtoUrl;
      toast.success("Abrindo seu aplicativo de e-mail. Envie a mensagem para concluir.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível abrir o e-mail. Tente novamente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Falar com o suporte</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo. Ao enviar, seu programa de e-mail será aberto com a mensagem dirigida a{" "}
            <span className="font-medium text-foreground">{SUPPORT_EMAIL}</span>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="seu@email.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto</FormLabel>
                  <FormControl>
                    <Input placeholder="Resumo do pedido de ajuda" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva sua dúvida ou problema..." className="min-h-[120px] resize-y" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Abrir e-mail</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactSupportModal;

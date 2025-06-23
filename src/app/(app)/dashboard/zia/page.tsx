
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { askZia } from "@/ai/flows/zia-flow";
import type { ZiaInput } from "@/ai/flows/zia-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, User, Bot } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function ZiaChatPage() {
  const { user, companyProfile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) {
        if (!user) {
          toast({
            variant: "destructive",
            title: "Error de autenticación",
            description: "No se ha podido verificar tu sesión. Por favor, recarga la página.",
          });
        }
        return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const ziaInput: ZiaInput = {
        query: input,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        userId: user.uid,
      };
      const response = await askZia(ziaInput);
      const ziaMessage: Message = { role: "model", content: response.response };
      setMessages(prev => [...prev, ziaMessage]);
    } catch (error) {
      console.error("Error calling ZIA:", error);
      toast({
        variant: "destructive",
        title: "Error de Comunicación",
        description: "No se pudo obtener una respuesta de ZIA. Por favor, intente de nuevo.",
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };


  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg h-[80vh] flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Sparkles className="mr-3 h-7 w-7" />
            ZIA - Asistente Inteligente
          </CardTitle>
          <CardDescription>
            Chatea con ZIA para obtener información sobre tu operación. Prueba preguntando: "¿Cuál es mi stock actual?" o "¿Cuáles fueron mis últimas 5 compras?".
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-4",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "model" && (
                    <Avatar className="h-9 w-9 border-2 border-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot size={20} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-md lg:max-w-xl rounded-xl p-3 text-sm whitespace-pre-wrap",
                       message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {message.content}
                  </div>
                  {message.role === "user" && user && (
                     <Avatar className="h-9 w-9 border">
                      {companyProfile?.logoUrl ? (
                         <AvatarImage src={companyProfile.logoUrl} alt="User" />
                      ) : null}
                       <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                         {getInitials(user.email || 'U')}
                       </AvatarFallback>
                     </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                 <div className="flex items-start gap-4 justify-start">
                    <Avatar className="h-9 w-9 border-2 border-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot size={20} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-md lg:max-w-xl rounded-xl p-3 bg-muted text-foreground space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                 </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta a ZIA..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

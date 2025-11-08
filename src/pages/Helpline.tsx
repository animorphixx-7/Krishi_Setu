import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Phone, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

const Helpline = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please login to send messages");
      navigate("/auth");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          user_id: user.id,
          message: message.trim(),
          is_admin_reply: false,
        });

      if (error) throw error;
      
      toast.success("Message sent successfully!");
      setMessage("");
      fetchMessages();
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-primary">Helpline & Support</h1>
          </div>
          <p className="text-muted-foreground">Get assistance with your queries and concerns</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-soft">
            <CardContent className="pt-6 text-center">
              <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Call Us</h3>
              <p className="text-muted-foreground text-sm mb-2">Mon-Sat, 9 AM - 6 PM</p>
              <p className="text-primary font-semibold">+91 98765 43210</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="pt-6 text-center">
              <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Email Us</h3>
              <p className="text-muted-foreground text-sm mb-2">We'll respond within 24 hours</p>
              <p className="text-primary font-semibold">support@krishisetu.com</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="pt-6 text-center">
              <MessageSquare className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Live Chat</h3>
              <p className="text-muted-foreground text-sm mb-2">Send us a message below</p>
              <p className="text-primary font-semibold">Instant Support</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Send a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  disabled={!user}
                />
                {!user && (
                  <p className="text-sm text-amber-600">
                    Please <Button variant="link" className="px-1" onClick={() => navigate("/auth")}>login</Button> to send messages
                  </p>
                )}
                <Button type="submit" disabled={loading || !user} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {user && (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle>Your Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No messages yet</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg ${
                          msg.is_admin_reply
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm font-semibold mb-1">
                          {msg.is_admin_reply ? "Support Team" : "You"}
                        </p>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8">
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">How do I book equipment?</h3>
                <p className="text-sm text-muted-foreground">
                  Browse the equipment page, select your desired item, choose dates, and confirm your booking.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What payment methods are accepted?</h3>
                <p className="text-sm text-muted-foreground">
                  We accept cash payments, UPI, and bank transfers. Payment details will be shared after booking confirmation.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How can I list my equipment?</h3>
                <p className="text-sm text-muted-foreground">
                  Create an account as an Equipment Owner, navigate to "My Equipment", and add your equipment details with images.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Helpline;

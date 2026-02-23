import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, MapPin, Phone } from "lucide-react";

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  maskedContact?: string;
  equipment: {
    name: string;
    category: string;
    district: string;
    image_url: string;
    owner_id: string;
    contact_number: string;
  };
}

const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchBookings();
  }, [user, navigate]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          equipment (
            name,
            category,
            district,
            contact_number,
            image_url,
            owner_id
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Mask contacts using server-side function
      const bookingsWithMasked = await Promise.all(
        (data || []).map(async (booking) => {
          const { data: masked } = await supabase.rpc("get_masked_contact", {
            contact: booking.equipment.contact_number,
            equipment_owner_id: booking.equipment.owner_id,
          });
          return { ...booking, maskedContact: masked || "**********" };
        })
      );
      
      setBookings(bookingsWithMasked);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load your bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });
      fetchBookings();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">My Bookings</h1>

        <div className="grid gap-6">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No bookings yet. Browse equipment to make your first booking!
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{booking.equipment.name}</span>
                    <Badge variant={
                      booking.status === "confirmed" ? "default" :
                      booking.status === "cancelled" ? "destructive" :
                      "secondary"
                    }>
                      {booking.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {booking.equipment.image_url && (
                      <img
                        src={booking.equipment.image_url}
                        alt={booking.equipment.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Rental Period</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.start_date).toLocaleDateString()} to{" "}
                            {new Date(booking.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Location</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.equipment.district}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Contact</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.maskedContact || "**********"}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-lg font-bold text-primary">
                          Total: ₹{booking.total_price}
                        </p>
                      </div>
                      {booking.status === "pending" && (
                        <Button
                          variant="destructive"
                          onClick={() => cancelBooking(booking.id)}
                          className="w-full"
                        >
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBookings;

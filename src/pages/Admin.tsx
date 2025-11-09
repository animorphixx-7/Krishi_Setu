import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  category: string;
  district: string;
  price_per_day: number;
  status: string;
  owner_id: string;
  profiles: { full_name: string };
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  equipment: { name: string };
  profiles: { full_name: string };
}

const Admin = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== "admin") {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, userRole, navigate]);

  const fetchData = async () => {
    try {
      const [equipmentRes, bookingsRes] = await Promise.all([
        supabase
          .from("equipment")
          .select("*, profiles(full_name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("*, equipment(name), profiles(full_name)")
          .order("created_at", { ascending: false }),
      ]);

      if (equipmentRes.error) throw equipmentRes.error;
      if (bookingsRes.error) throw bookingsRes.error;

      setEquipment(equipmentRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEquipmentStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("equipment")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Equipment ${status}`,
      });
      fetchData();
    } catch (error) {
      console.error("Error updating equipment:", error);
      toast({
        title: "Error",
        description: "Failed to update equipment status",
        variant: "destructive",
      });
    }
  };

  const updateBookingStatus = async (id: string, status: "confirmed" | "cancelled") => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Booking ${status}`,
      });
      fetchData();
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
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
        <h1 className="text-4xl font-bold text-foreground mb-8">Admin Panel</h1>

        <Tabs defaultValue="equipment" className="w-full">
          <TabsList>
            <TabsTrigger value="equipment">Equipment Approval</TabsTrigger>
            <TabsTrigger value="bookings">Manage Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="mt-6">
            <div className="grid gap-4">
              {equipment.filter(e => e.status === "pending").length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No pending equipment approvals
                  </CardContent>
                </Card>
              ) : (
                equipment
                  .filter((e) => e.status === "pending")
                  .map((item) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{item.name}</span>
                          <Badge variant="secondary">{item.status}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-muted-foreground">
                            <strong>Owner:</strong> {item.profiles.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Category:</strong> {item.category}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>District:</strong> {item.district}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Price:</strong> ₹{item.price_per_day}/day
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => updateEquipmentStatus(item.id, "approved")}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => updateEquipmentStatus(item.id, "rejected")}
                            variant="destructive"
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <div className="grid gap-4">
              {bookings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No bookings found
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
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-muted-foreground">
                          <strong>Customer:</strong> {booking.profiles.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Duration:</strong>{" "}
                          {new Date(booking.start_date).toLocaleDateString()} -{" "}
                          {new Date(booking.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Total:</strong> ₹{booking.total_price}
                        </p>
                      </div>
                      {booking.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => updateBookingStatus(booking.id, "confirmed")}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm
                          </Button>
                          <Button
                            onClick={() => updateBookingStatus(booking.id, "cancelled")}
                            variant="destructive"
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

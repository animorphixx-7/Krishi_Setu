import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, XCircle, Loader2,
  IndianRupee, CalendarCheck, Users, Tractor,
  TrendingUp, BarChart3
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

interface Equipment {
  id: string;
  name: string;
  category: string;
  district: string;
  price_per_day: number;
  status: string;
  owner_id: string;
  created_at?: string;
  profiles: { full_name: string };
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  created_at?: string;
  equipment: { name: string };
  profiles: { full_name: string };
}

interface Profile {
  id: string;
  role: string;
  created_at: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
];

const Admin = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
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
      const [equipmentRes, bookingsRes, profilesRes] = await Promise.all([
        supabase
          .from("equipment")
          .select("id, name, category, district, price_per_day, status, owner_id, created_at, profiles(full_name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("*, equipment(name), profiles(full_name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, role, created_at"),
      ]);

      if (equipmentRes.error) throw equipmentRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setEquipment(equipmentRes.data || []);
      setBookings(bookingsRes.data || []);
      setProfiles(profilesRes.data || []);
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

  // Analytics computations
  const analytics = useMemo(() => {
    const totalRevenue = bookings
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .reduce((sum, b) => sum + b.total_price, 0);

    const totalBookings = bookings.length;
    const activeUsers = profiles.length;
    const totalEquipment = equipment.length;
    const approvedEquipment = equipment.filter((e) => e.status === "approved").length;
    const pendingEquipment = equipment.filter((e) => e.status === "pending").length;

    // Booking status breakdown for pie chart
    const statusCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      statusCounts[b.status || "pending"] = (statusCounts[b.status || "pending"] || 0) + 1;
    });
    const bookingStatusData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

    // Equipment by category for bar chart
    const categoryCounts: Record<string, number> = {};
    equipment.forEach((e) => {
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    });
    const equipmentCategoryData = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count,
    }));

    // Revenue by month for line chart
    const monthlyRevenue: Record<string, number> = {};
    bookings
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .forEach((b) => {
        const date = new Date(b.created_at || b.start_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyRevenue[key] = (monthlyRevenue[key] || 0) + b.total_price;
      });
    const revenueData = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({
        month,
        revenue,
      }));

    // Users by role
    const roleCounts: Record<string, number> = {};
    profiles.forEach((p) => {
      roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
    });
    const userRoleData = Object.entries(roleCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
      value,
    }));

    return {
      totalRevenue,
      totalBookings,
      activeUsers,
      totalEquipment,
      approvedEquipment,
      pendingEquipment,
      bookingStatusData,
      equipmentCategoryData,
      revenueData,
      userRoleData,
    };
  }, [bookings, equipment, profiles]);

  const updateEquipmentStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      const { error } = await supabase.from("equipment").update({ status }).eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: `Equipment ${status}` });
      fetchData();
    } catch (error) {
      console.error("Error updating equipment:", error);
      toast({ title: "Error", description: "Failed to update equipment status", variant: "destructive" });
    }
  };

  const updateBookingStatus = async (id: string, status: "confirmed" | "cancelled") => {
    try {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: `Booking ${status}` });
      fetchData();
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({ title: "Error", description: "Failed to update booking status", variant: "destructive" });
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

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="equipment">Equipment Approval</TabsTrigger>
            <TabsTrigger value="bookings">Manage Bookings</TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6 space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                  <IndianRupee className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">₹{analytics.totalRevenue.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground mt-1">From confirmed & completed bookings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
                  <CalendarCheck className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analytics.totalBookings}</p>
                  <p className="text-xs text-muted-foreground mt-1">All time bookings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Registered Users</CardTitle>
                  <Users className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analytics.activeUsers}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total platform users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Equipment</CardTitle>
                  <Tractor className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analytics.totalEquipment}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.approvedEquipment} approved · {analytics.pendingEquipment} pending
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.revenueData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No revenue data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={analytics.revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]} />
                        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Booking Status Pie */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Booking Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.bookingStatusData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No bookings yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={analytics.bookingStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {analytics.bookingStatusData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Equipment by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Equipment by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.equipmentCategoryData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No equipment yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={analytics.equipmentCategoryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Users by Role */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Users by Role</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.userRoleData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No users yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={analytics.userRoleData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {analytics.userRoleData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Equipment Tab */}
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
                          <Button onClick={() => updateEquipmentStatus(item.id, "approved")} className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button onClick={() => updateEquipmentStatus(item.id, "rejected")} variant="destructive" className="flex-1">
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

          {/* Bookings Tab */}
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
                          <Button onClick={() => updateBookingStatus(booking.id, "confirmed")} className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm
                          </Button>
                          <Button onClick={() => updateBookingStatus(booking.id, "cancelled")} variant="destructive" className="flex-1">
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

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { MapPin, IndianRupee, Phone, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const EquipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });

  useEffect(() => {
    if (id) {
      fetchEquipment();
      fetchReviews();
    }
  }, [id]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          *,
          profiles:owner_id (full_name, phone)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setEquipment(data);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      toast.error("Failed to load equipment details");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq("equipment_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error("Please login to book equipment");
      navigate("/auth");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select booking dates");
      return;
    }

    if (startDate >= endDate) {
      toast.error("End date must be after start date");
      return;
    }

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = days * equipment.price_per_day;

    try {
      const { error } = await supabase
        .from("bookings")
        .insert({
          equipment_id: id,
          user_id: user.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          total_price: totalPrice,
          status: "pending",
        });

      if (error) throw error;
      
      toast.success("Booking request sent successfully!");
      navigate("/my-bookings");
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking");
    }
  };

  const handleReviewSubmit = async () => {
    if (!user) {
      toast.error("Please login to submit a review");
      return;
    }

    try {
      const { error } = await supabase
        .from("reviews")
        .insert({
          equipment_id: id,
          user_id: user.id,
          rating: newReview.rating,
          comment: newReview.comment,
        });

      if (error) throw error;
      
      toast.success("Review submitted successfully!");
      setNewReview({ rating: 5, comment: "" });
      fetchReviews();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("You have already reviewed this equipment");
      } else {
        toast.error("Failed to submit review");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8 text-center">Loading...</div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8 text-center">Equipment not found</div>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "No ratings";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4 shadow-medium">
              {equipment.image_url ? (
                <img
                  src={equipment.image_url}
                  alt={equipment.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No image available
                </div>
              )}
            </div>
            <div className="flex gap-4 items-center">
              <Badge variant="secondary">{equipment.category}</Badge>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-semibold">{averageRating}</span>
                <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">{equipment.name}</h1>
              <div className="flex items-center text-muted-foreground mb-4">
                <MapPin className="h-4 w-4 mr-1" />
                {equipment.district}
              </div>
              <p className="text-muted-foreground">{equipment.description}</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Price per day</p>
                <div className="flex items-center text-3xl font-bold text-primary">
                  <IndianRupee className="h-7 w-7" />
                  {equipment.price_per_day}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Contact</p>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="font-semibold">{equipment.contact_number}</span>
                </div>
              </div>
            </div>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Book this Equipment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border mt-2"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border mt-2"
                    />
                  </div>
                </div>
                {startDate && endDate && startDate < endDate && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm mb-2">
                      Duration: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                    <p className="text-lg font-semibold text-primary">
                      Total: ₹{Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * equipment.price_per_day}
                    </p>
                  </div>
                )}
                <Button onClick={handleBooking} className="w-full" size="lg">
                  Confirm Booking
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Write a Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating })}
                      className={`p-2 ${
                        rating <= newReview.rating ? "text-amber-500" : "text-muted-foreground"
                      }`}
                    >
                      <Star className={`h-6 w-6 ${rating <= newReview.rating ? "fill-current" : ""}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Comment</Label>
                <Textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  placeholder="Share your experience..."
                  rows={3}
                />
              </div>
              <Button onClick={handleReviewSubmit}>Submit Review</Button>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Reviews ({reviews.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No reviews yet</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{review.profiles?.full_name}</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span>{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{review.comment}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetail;

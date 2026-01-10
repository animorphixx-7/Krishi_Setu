import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { equipmentSchema, type EquipmentFormData } from "@/lib/validation";

interface Equipment {
  id: string;
  name: string;
  description: string;
  category: string;
  district: string;
  price_per_day: number;
  contact_number: string;
  image_url: string;
  status: string;
  is_available: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  category?: string;
  district?: string;
  price_per_day?: string;
  contact_number?: string;
  image_url?: string;
}

const MyEquipment = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    district: "",
    price_per_day: "",
    contact_number: "",
    image_url: "",
  });

  useEffect(() => {
    if (!user || (userRole !== "equipment_owner" && userRole !== "admin")) {
      navigate("/");
      return;
    }
    fetchEquipment();
  }, [user, userRole, navigate]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      toast({
        title: "Error",
        description: "Failed to load your equipment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const result = equipmentSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        errors[field] = err.message;
      });
      setFormErrors(errors);
      return false;
    }
    
    setFormErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("equipment").insert({
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        district: formData.district.trim(),
        price_per_day: parseFloat(formData.price_per_day),
        contact_number: formData.contact_number.trim(),
        image_url: formData.image_url.trim() || null,
        owner_id: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Equipment added successfully. Pending admin approval.",
      });
      setIsDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        category: "",
        district: "",
        price_per_day: "",
        contact_number: "",
        image_url: "",
      });
      setFormErrors({});
      fetchEquipment();
    } catch (error) {
      console.error("Error adding equipment:", error);
      toast({
        title: "Error",
        description: "Failed to add equipment",
        variant: "destructive",
      });
    }
  };

  const deleteEquipment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment?")) return;

    try {
      const { error } = await supabase.from("equipment").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Equipment deleted successfully",
      });
      fetchEquipment();
    } catch (error) {
      console.error("Error deleting equipment:", error);
      toast({
        title: "Error",
        description: "Failed to delete equipment",
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">My Equipment</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Equipment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Equipment Name</Label>
                  <Input
                    id="name"
                    required
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={formErrors.name ? "border-destructive" : ""}
                  />
                  {formErrors.name && (
                    <p className="text-sm text-destructive mt-1">{formErrors.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{formData.name.length}/100 characters</p>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    required
                    maxLength={50}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Tractor, Harvester"
                    className={formErrors.category ? "border-destructive" : ""}
                  />
                  {formErrors.category && (
                    <p className="text-sm text-destructive mt-1">{formErrors.category}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    maxLength={1000}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={formErrors.description ? "border-destructive" : ""}
                  />
                  {formErrors.description && (
                    <p className="text-sm text-destructive mt-1">{formErrors.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/1000 characters</p>
                </div>
                <div>
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    required
                    maxLength={50}
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className={formErrors.district ? "border-destructive" : ""}
                  />
                  {formErrors.district && (
                    <p className="text-sm text-destructive mt-1">{formErrors.district}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="price">Price per Day (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    required
                    min="1"
                    max="100000"
                    value={formData.price_per_day}
                    onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })}
                    className={formErrors.price_per_day ? "border-destructive" : ""}
                  />
                  {formErrors.price_per_day && (
                    <p className="text-sm text-destructive mt-1">{formErrors.price_per_day}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="contact">Contact Number</Label>
                  <Input
                    id="contact"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className={formErrors.contact_number ? "border-destructive" : ""}
                  />
                  {formErrors.contact_number && (
                    <p className="text-sm text-destructive mt-1">{formErrors.contact_number}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Enter a valid 10-digit Indian mobile number starting with 6-9</p>
                </div>
                <div>
                  <Label htmlFor="image">Image URL (optional)</Label>
                  <Input
                    id="image"
                    type="url"
                    maxLength={500}
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className={formErrors.image_url ? "border-destructive" : ""}
                  />
                  {formErrors.image_url && (
                    <p className="text-sm text-destructive mt-1">{formErrors.image_url}</p>
                  )}
                </div>
                <Button type="submit" className="w-full">Add Equipment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                No equipment added yet. Click "Add Equipment" to get started.
              </CardContent>
            </Card>
          ) : (
            equipment.map((item) => (
              <Card key={item.id}>
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{item.name}</span>
                    <Badge variant={
                      item.status === "approved" ? "default" :
                      item.status === "rejected" ? "destructive" :
                      "secondary"
                    }>
                      {item.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="text-sm">
                      <strong>Category:</strong> {item.category}
                    </p>
                    <p className="text-sm">
                      <strong>District:</strong> {item.district}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      ₹{item.price_per_day}/day
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteEquipment(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

export default MyEquipment;

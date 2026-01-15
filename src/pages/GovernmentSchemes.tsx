import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Landmark, Loader2, Calendar, Clock, AlertTriangle, CheckCircle, 
  FileText, IndianRupee, Users, ExternalLink, Phone, Bell,
  Sparkles, ArrowRight, Shield, Banknote, Tractor, GraduationCap,
  Building, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface Scheme {
  name: string;
  name_hindi?: string;
  type: "central" | "state" | "district";
  category: "subsidy" | "insurance" | "loan" | "direct_benefit" | "infrastructure" | "training" | "market_support";
  description: string;
  benefits: string[];
  benefit_amount?: string;
  eligibility: string[];
  documents_required?: string[];
  application_deadline?: string;
  is_deadline_approaching?: boolean;
  days_remaining?: number;
  status: "open" | "closing_soon" | "closed" | "upcoming";
  how_to_apply: string;
  apply_link?: string;
  helpline?: string;
  is_new?: boolean;
  priority?: "high" | "medium" | "low";
}

interface Announcement {
  title: string;
  date: string;
  description: string;
  scheme_name?: string;
  is_important?: boolean;
}

interface Deadline {
  scheme_name: string;
  deadline: string;
  days_remaining: number;
  action_required?: string;
}

interface SchemesData {
  district: string;
  state?: string;
  last_updated?: string;
  schemes: Scheme[];
  latest_announcements: Announcement[];
  upcoming_deadlines: Deadline[];
  statistics?: {
    total_schemes: number;
    open_schemes: number;
    closing_soon: number;
    total_benefit_potential?: string;
  };
}

const DISTRICTS = [
  "Pune", "Nashik", "Nagpur", "Aurangabad", "Kolhapur", 
  "Sangli", "Solapur", "Ahmednagar", "Satara", "Jalgaon"
];

const GovernmentSchemes = () => {
  const [schemesData, setSchemesData] = useState<SchemesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("Pune");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/government-schemes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ district: selectedDistrict }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error(result.error || "Failed to fetch schemes");
        }
        return;
      }

      setSchemesData(result.data);
      toast.success("Government schemes loaded successfully!");
    } catch (error) {
      console.error("Error fetching schemes:", error);
      toast.error("Failed to fetch government schemes");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge className="bg-green-500">Open</Badge>;
      case "closing_soon": return <Badge className="bg-orange-500">Closing Soon</Badge>;
      case "closed": return <Badge className="bg-red-500">Closed</Badge>;
      case "upcoming": return <Badge className="bg-blue-500">Upcoming</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "central": return <Badge variant="outline" className="border-blue-500 text-blue-600">Central</Badge>;
      case "state": return <Badge variant="outline" className="border-green-500 text-green-600">State</Badge>;
      case "district": return <Badge variant="outline" className="border-purple-500 text-purple-600">District</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "subsidy": return <IndianRupee className="h-4 w-4" />;
      case "insurance": return <Shield className="h-4 w-4" />;
      case "loan": return <Banknote className="h-4 w-4" />;
      case "direct_benefit": return <Users className="h-4 w-4" />;
      case "infrastructure": return <Tractor className="h-4 w-4" />;
      case "training": return <GraduationCap className="h-4 w-4" />;
      case "market_support": return <TrendingUp className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const filteredSchemes = schemesData?.schemes.filter(scheme => 
    selectedCategory === "all" || scheme.category === selectedCategory
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Landmark className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-primary">Government Schemes</h1>
          </div>
          <p className="text-muted-foreground">
            Discover agricultural schemes, subsidies, and benefits available in your district
          </p>
        </div>

        {/* District Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Select Your District
            </CardTitle>
            <CardDescription>Choose your district to see available government schemes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map(district => (
                    <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={fetchSchemes} disabled={loading} size="lg">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Landmark className="h-4 w-4 mr-2" />
                )}
                {loading ? "Loading..." : "Find Schemes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">Finding government schemes for {selectedDistrict}...</p>
            <p className="text-muted-foreground text-sm mt-2">This may take a few seconds</p>
          </div>
        )}

        {schemesData && !loading && (
          <>
            {/* Statistics Overview */}
            {schemesData.statistics && (
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500 rounded-lg">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{schemesData.statistics.total_schemes}</p>
                        <p className="text-sm text-muted-foreground">Total Schemes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-500 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{schemesData.statistics.open_schemes}</p>
                        <p className="text-sm text-muted-foreground">Open for Application</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-500 rounded-lg">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{schemesData.statistics.closing_soon}</p>
                        <p className="text-sm text-muted-foreground">Closing Soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {schemesData.statistics.total_benefit_potential && (
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500 rounded-lg">
                          <IndianRupee className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">{schemesData.statistics.total_benefit_potential}</p>
                          <p className="text-sm text-muted-foreground">Potential Benefits</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Upcoming Deadlines Alert */}
            {schemesData.upcoming_deadlines.length > 0 && (
              <Card className="mb-6 border-orange-300 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
                    <AlertTriangle className="h-5 w-5" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {schemesData.upcoming_deadlines.slice(0, 6).map((deadline, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-orange-900/30 rounded-lg">
                        <Calendar className="h-5 w-5 text-orange-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{deadline.scheme_name}</p>
                          <p className="text-xs text-muted-foreground">{deadline.deadline}</p>
                        </div>
                        <Badge variant={deadline.days_remaining <= 7 ? "destructive" : "outline"}>
                          {deadline.days_remaining} days
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Latest Announcements */}
            {schemesData.latest_announcements.length > 0 && (
              <Card className="mb-6 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-500" />
                    Latest Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {schemesData.latest_announcements.slice(0, 4).map((announcement, idx) => (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${announcement.is_important ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-muted/50'}`}>
                        {announcement.is_important && <Sparkles className="h-4 w-4 text-blue-500 mt-0.5" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{announcement.title}</p>
                            {announcement.is_important && <Badge className="bg-blue-500 text-[10px]">New</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{announcement.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{announcement.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Schemes List */}
            <Tabs defaultValue="all" className="mb-6">
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="all" onClick={() => setSelectedCategory("all")}>All Schemes</TabsTrigger>
                <TabsTrigger value="subsidy" onClick={() => setSelectedCategory("subsidy")}>Subsidies</TabsTrigger>
                <TabsTrigger value="insurance" onClick={() => setSelectedCategory("insurance")}>Insurance</TabsTrigger>
                <TabsTrigger value="loan" onClick={() => setSelectedCategory("loan")}>Loans</TabsTrigger>
                <TabsTrigger value="direct_benefit" onClick={() => setSelectedCategory("direct_benefit")}>Direct Benefits</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <div className="grid gap-6 md:grid-cols-2">
                  {filteredSchemes.map((scheme, idx) => (
                    <Card key={idx} className={`relative ${scheme.is_new ? 'ring-2 ring-blue-400' : ''} ${scheme.status === 'closing_soon' ? 'border-orange-300' : ''}`}>
                      {scheme.is_new && (
                        <div className="absolute -top-2 -right-2">
                          <Badge className="bg-blue-500 shadow-lg">
                            <Sparkles className="h-3 w-3 mr-1" /> New
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                              {getCategoryIcon(scheme.category)}
                            </div>
                            <div>
                              <CardTitle className="text-lg leading-tight">{scheme.name}</CardTitle>
                              {scheme.name_hindi && (
                                <p className="text-sm text-muted-foreground">{scheme.name_hindi}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {getStatusBadge(scheme.status)}
                            {getTypeBadge(scheme.type)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{scheme.description}</p>

                        {/* Benefits */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">BENEFITS</p>
                          <ul className="space-y-1">
                            {scheme.benefits.slice(0, 3).map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                          {scheme.benefit_amount && (
                            <Badge variant="outline" className="mt-2 border-green-300 text-green-700">
                              <IndianRupee className="h-3 w-3 mr-1" />
                              {scheme.benefit_amount}
                            </Badge>
                          )}
                        </div>

                        {/* Eligibility */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">ELIGIBILITY</p>
                          <ul className="space-y-1">
                            {scheme.eligibility.slice(0, 3).map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Users className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Deadline */}
                        {scheme.application_deadline && (
                          <div className={`flex items-center gap-2 p-2 rounded-lg ${scheme.is_deadline_approaching ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-muted/50'}`}>
                            <Calendar className={`h-4 w-4 ${scheme.is_deadline_approaching ? 'text-orange-600' : 'text-muted-foreground'}`} />
                            <span className="text-sm">
                              Deadline: <strong>{scheme.application_deadline}</strong>
                            </span>
                            {scheme.days_remaining !== undefined && (
                              <Badge variant={scheme.days_remaining <= 7 ? "destructive" : "outline"} className="ml-auto">
                                {scheme.days_remaining} days left
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* How to Apply */}
                        <div className="pt-3 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">HOW TO APPLY</p>
                          <p className="text-sm">{scheme.how_to_apply}</p>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {scheme.apply_link && (
                              <Button size="sm" asChild>
                                <a href={scheme.apply_link} target="_blank" rel="noopener noreferrer">
                                  Apply Now <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </Button>
                            )}
                            {scheme.helpline && (
                              <Button size="sm" variant="outline">
                                <Phone className="h-3 w-3 mr-1" />
                                {scheme.helpline}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Documents Required */}
                        {scheme.documents_required && scheme.documents_required.length > 0 && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Required Documents ({scheme.documents_required.length})
                            </summary>
                            <ul className="mt-2 space-y-1 pl-4">
                              {scheme.documents_required.map((doc, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                  {doc}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Other tab contents use the same filtered view */}
              {["subsidy", "insurance", "loan", "direct_benefit"].map(category => (
                <TabsContent key={category} value={category} className="mt-0">
                  <div className="grid gap-6 md:grid-cols-2">
                    {filteredSchemes.map((scheme, idx) => (
                      <Card key={idx} className={`relative ${scheme.is_new ? 'ring-2 ring-blue-400' : ''}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                                {getCategoryIcon(scheme.category)}
                              </div>
                              <CardTitle className="text-lg leading-tight">{scheme.name}</CardTitle>
                            </div>
                            {getStatusBadge(scheme.status)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">{scheme.description}</p>
                          {scheme.benefit_amount && (
                            <Badge variant="outline" className="border-green-300 text-green-700">
                              <IndianRupee className="h-3 w-3 mr-1" />
                              {scheme.benefit_amount}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}

        {!schemesData && !loading && (
          <Card className="text-center py-12">
            <CardContent>
              <Landmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">Discover Government Schemes</h3>
              <p className="text-muted-foreground mb-4">
                Select your district and click "Find Schemes" to see all available government schemes, 
                subsidies, and benefits for farmers in your area.
              </p>
              <Button onClick={fetchSchemes} disabled={loading}>
                <Landmark className="h-4 w-4 mr-2" />
                Find Schemes
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <p className="text-sm text-muted-foreground">
            <strong>Disclaimer:</strong> Scheme information is AI-generated based on publicly available data. 
            Always verify details with official government sources before applying. Deadlines and eligibility 
            criteria may change. Visit your local Krishi Vigyan Kendra or District Agriculture Office for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GovernmentSchemes;

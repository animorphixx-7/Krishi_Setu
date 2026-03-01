import { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  Upload,
  Leaf,
  ShieldAlert,
  ShieldCheck,
  Bug,
  Pill,
  Sprout,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  X,
} from "lucide-react";

interface Diagnosis {
  plant_name: string;
  health_status: string;
  disease_name: string;
  confidence: string;
  symptoms: string[];
  causes: string[];
  treatment: { method: string; description: string }[];
  prevention: string[];
  organic_remedies: string[];
  severity: string;
  additional_notes: string;
}

const CropDoctor = () => {
  const [image, setImage] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setDiagnosis(null);
      setRawError(null);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setDiagnosis(null);
    setRawError(null);

    try {
      const { data, error } = await supabase.functions.invoke("crop-doctor", {
        body: { image },
      });

      if (error) throw error;

      if (data?.error) {
        setRawError(data.raw_response || data.error);
        toast({ title: "Analysis Issue", description: data.error, variant: "destructive" });
      } else {
        setDiagnosis(data as Diagnosis);
        toast({ title: "Analysis Complete!", description: `Identified: ${data.plant_name}` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to analyze image", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setImage(null);
    setDiagnosis(null);
    setRawError(null);
  };

  const severityColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case "severe": return "destructive";
      case "moderate": return "secondary";
      case "mild": return "outline";
      default: return "default";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Leaf className="h-5 w-5" />
            <span className="font-semibold">AI-Powered</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            🌿 Crop Doctor
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upload a photo of your crop and get instant disease diagnosis with treatment suggestions
          </p>
        </div>

        {/* Upload Section */}
        {!image ? (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="p-4 bg-primary/10 rounded-full">
                <ImageIcon className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground mb-1">Upload Crop Image</p>
                <p className="text-sm text-muted-foreground">Take a clear photo of the affected leaf or plant</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => cameraInputRef.current?.click()} variant="default" className="gap-2">
                  <Camera className="h-4 w-4" /> Take Photo
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" /> Browse Files
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <img src={image} alt="Uploaded crop" className="w-full max-h-80 object-contain rounded-lg" />
                  <Button size="icon" variant="destructive" className="absolute top-2 right-2" onClick={clear}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {!diagnosis && !loading && (
                  <Button onClick={analyze} className="w-full mt-4 gap-2" size="lg">
                    <Leaf className="h-5 w-5" /> Analyze Crop
                  </Button>
                )}
                {loading && (
                  <Button disabled className="w-full mt-4 gap-2" size="lg">
                    <Loader2 className="h-5 w-5 animate-spin" /> Analyzing...
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {diagnosis && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Summary Card */}
                <Card className={diagnosis.health_status === "Healthy" ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        {diagnosis.health_status === "Healthy" ? (
                          <ShieldCheck className="h-6 w-6 text-green-600" />
                        ) : (
                          <ShieldAlert className="h-6 w-6 text-destructive" />
                        )}
                        {diagnosis.plant_name}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={diagnosis.health_status === "Healthy" ? "default" : "destructive"}>
                          {diagnosis.health_status}
                        </Badge>
                        {diagnosis.severity !== "None" && (
                          <Badge variant={severityColor(diagnosis.severity)}>{diagnosis.severity}</Badge>
                        )}
                        <Badge variant="outline">Confidence: {diagnosis.confidence}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {diagnosis.disease_name !== "None" && (
                    <CardContent>
                      <p className="text-lg font-semibold text-destructive">Disease: {diagnosis.disease_name}</p>
                    </CardContent>
                  )}
                </Card>

                {/* Symptoms */}
                {diagnosis.symptoms?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Bug className="h-5 w-5 text-orange-500" /> Symptoms
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {diagnosis.symptoms.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-orange-500 mt-1">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Causes */}
                {diagnosis.causes?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" /> Causes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {diagnosis.causes.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-yellow-500 mt-1">•</span> {c}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Treatment */}
                {diagnosis.treatment?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Pill className="h-5 w-5 text-blue-500" /> Treatment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {diagnosis.treatment.map((t, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50">
                          <p className="font-medium text-foreground">{t.method}</p>
                          <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Organic Remedies */}
                {diagnosis.organic_remedies?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Sprout className="h-5 w-5 text-green-500" /> Organic Remedies
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {diagnosis.organic_remedies.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-green-500 mt-1">🌱</span> {r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Prevention */}
                {diagnosis.prevention?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldCheck className="h-5 w-5 text-primary" /> Prevention Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {diagnosis.prevention.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-1">✓</span> {p}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Notes */}
                {diagnosis.additional_notes && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground italic">
                        💡 {diagnosis.additional_notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Button onClick={clear} variant="outline" className="w-full gap-2">
                  <Camera className="h-4 w-4" /> Analyze Another Crop
                </Button>
              </div>
            )}

            {rawError && (
              <Card className="border-destructive/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rawError}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CropDoctor;

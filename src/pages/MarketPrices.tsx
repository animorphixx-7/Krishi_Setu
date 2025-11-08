import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, IndianRupee } from "lucide-react";
import Navbar from "@/components/Navbar";

interface MarketPrice {
  id: string;
  crop_name: string;
  price_per_quintal: number;
  market_name: string;
  district: string;
  updated_at: string;
}

const MarketPrices = () => {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase
        .from("market_prices")
        .select("*")
        .order("crop_name");

      if (error) throw error;
      setPrices(data || []);
    } catch (error) {
      console.error("Error fetching market prices:", error);
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
            <TrendingUp className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-primary">Crop Market Prices</h1>
          </div>
          <p className="text-muted-foreground">Live market rates across various districts in Maharashtra</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading market prices...</div>
        ) : (
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Current Prices (Per Quintal)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead className="text-right">Price (₹/Quintal)</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prices.map((price) => (
                      <TableRow key={price.id}>
                        <TableCell className="font-medium">
                          <Badge variant="outline">{price.crop_name}</Badge>
                        </TableCell>
                        <TableCell>{price.market_name}</TableCell>
                        <TableCell>{price.district}</TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end font-semibold text-primary">
                            <IndianRupee className="h-4 w-4" />
                            {price.price_per_quintal.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(price.updated_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Market prices are updated regularly and may vary based on quality, demand, and season. 
            Please verify current rates with your local market before making transactions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketPrices;

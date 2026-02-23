import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, IndianRupee, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  const [refreshing, setRefreshing] = useState(false);

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
      toast.error("Failed to load market prices");
    } finally {
      setLoading(false);
    }
  };

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to refresh market prices");
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-market-prices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error(data.error || "Failed to refresh prices");
        }
        return;
      }

      toast.success(data.message || "Market prices updated!");
      await fetchPrices();
    } catch (error) {
      console.error("Error refreshing prices:", error);
      toast.error("Failed to refresh market prices");
    } finally {
      setRefreshing(false);
    }
  };

  const getLastUpdated = () => {
    if (prices.length === 0) return null;
    const latest = prices.reduce((a, b) => 
      new Date(a.updated_at) > new Date(b.updated_at) ? a : b
    );
    return new Date(latest.updated_at);
  };

  const lastUpdated = getLastUpdated();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold text-primary">Crop Market Prices</h1>
            </div>
            <p className="text-muted-foreground">
              Live market rates across various districts in Maharashtra
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  (Last updated: {lastUpdated.toLocaleString()})
                </span>
              )}
            </p>
          </div>
          <Button 
            onClick={refreshPrices} 
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {refreshing ? "Fetching Live Prices..." : "Refresh Prices"}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p>Loading market prices...</p>
          </div>
        ) : prices.length === 0 ? (
          <Card className="shadow-medium">
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Prices Available</h3>
              <p className="text-muted-foreground mb-4">
                Click the refresh button to fetch the latest market prices.
              </p>
              <Button onClick={refreshPrices} disabled={refreshing}>
                {refreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch Prices
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
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
            <strong>Note:</strong> Market prices are fetched using AI and represent approximate current rates. 
            Actual prices may vary based on quality, demand, and local market conditions. 
            Please verify current rates with your local APMC market before making transactions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketPrices;

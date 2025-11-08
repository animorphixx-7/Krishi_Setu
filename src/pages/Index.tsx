import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tractor, ShoppingCart, Star, TrendingUp, Cloud, MessageSquare, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import heroImage from "@/assets/hero-farming.jpg";

const Index = () => {
  const features = [
    {
      icon: Tractor,
      title: "Equipment Rental",
      description: "Browse and rent modern farming equipment at affordable daily rates",
    },
    {
      icon: ShoppingCart,
      title: "Easy Booking",
      description: "Simple booking system with confirmed orders and booking history",
    },
    {
      icon: Star,
      title: "Reviews & Ratings",
      description: "Read genuine reviews from farmers and rate your rental experience",
    },
    {
      icon: TrendingUp,
      title: "Market Prices",
      description: "Stay updated with real-time crop market prices across districts",
    },
    {
      icon: Cloud,
      title: "Weather Forecast",
      description: "Plan your farming activities with accurate weather predictions",
    },
    {
      icon: MessageSquare,
      title: "24/7 Helpline",
      description: "Get instant support through our dedicated helpline service",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Modern farming equipment in agricultural fields"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        </div>
        <div className="container relative z-10">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              Krishi Setu
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Your Complete Agricultural Equipment & Farming Solution Hub
            </p>
            <p className="text-lg text-muted-foreground">
              Connect with equipment owners, access modern farming tools, and grow your agricultural business with confidence
            </p>
            <div className="flex gap-4">
              <Link to="/equipment">
                <Button size="lg" className="bg-gradient-hero">
                  Browse Equipment
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Everything You Need for Modern Farming
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive platform designed to support farmers, equipment owners, and agricultural businesses
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow">
                  <CardHeader>
                    <Icon className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-primary">
                Trusted by Farmers Across India
              </h2>
              <p className="text-lg text-muted-foreground">
                Our platform ensures verified equipment, secure bookings, and reliable service. Join thousands of satisfied farmers and equipment owners who trust Krishi Setu for their agricultural needs.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Card className="text-center p-6">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="font-semibold">Verified Equipment</p>
                </Card>
                <Card className="text-center p-6">
                  <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="font-semibold">Rated Service</p>
                </Card>
              </div>
            </div>
            <div className="bg-gradient-card rounded-lg p-8 shadow-medium">
              <h3 className="text-2xl font-bold mb-6">Ready to Get Started?</h3>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <div className="bg-primary rounded-full p-1 mr-3 mt-1">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                  <span>Create your free account in minutes</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary rounded-full p-1 mr-3 mt-1">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                  <span>Browse verified equipment in your district</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary rounded-full p-1 mr-3 mt-1">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                  <span>Book equipment and start farming smarter</span>
                </li>
              </ul>
              <Link to="/auth">
                <Button size="lg" className="w-full">
                  Sign Up Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;

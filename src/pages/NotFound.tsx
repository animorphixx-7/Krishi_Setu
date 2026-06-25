import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <main className="min-h-dvh w-full flex items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background px-6 py-16">
      <div className="text-center max-w-md animate-fade-in-up">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-10 w-10" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-3">
          Error 404
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
          Page not found
        </h1>
        <p className="text-base text-muted-foreground mb-2">
          We couldn't find the page you were looking for.
        </p>
        {location.pathname && (
          <p className="text-xs text-muted-foreground/80 mb-8 font-mono break-all">
            {location.pathname}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" variant="outline">
            <button type="button" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Go back
            </button>
          </Button>
          <Button asChild size="lg">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" aria-hidden="true" />
              Back home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck, Tractor } from "lucide-react";

const VerifyEmail = () => {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background p-4">
      <Card className="w-full max-w-md shadow-medium animate-fade-in-up">
        <CardHeader className="space-y-2 flex flex-col items-center text-center pt-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
            <Tractor className="h-7 w-7" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your inbox</CardTitle>
          <CardDescription className="max-w-xs">
            We've sent you a confirmation link to verify your email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center pb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5">
            <MailCheck className="h-10 w-10 text-primary" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Open the email from <span className="font-medium text-foreground">Krishi Setu</span> and
            click the verification link to activate your account. You can safely close this tab once
            verified.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>

  );
};

export default VerifyEmail;

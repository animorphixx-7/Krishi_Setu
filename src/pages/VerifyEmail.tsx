import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck, Tractor } from "lucide-react";

const VerifyEmail = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <Tractor className="h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl font-bold text-center">Verify your email</CardTitle>
          <CardDescription className="text-center">
            We've sent you a confirmation link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <MailCheck className="h-16 w-16 text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            Open the email from Krishi Setu and click the verification link to activate your account.
            You can close this tab once verified.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;

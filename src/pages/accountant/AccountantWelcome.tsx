import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Users, FileText, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AccountantWelcome() {
  const { profile } = useAuth();

  const steps = [
    {
      icon: Users,
      title: "Get Invited by Business Owners",
      description: "Business owners will invite you to manage their tax filings. You'll receive access once they add you.",
    },
    {
      icon: FileText,
      title: "Prepare & Review Tax Forms",
      description: "View, edit, and validate tax forms. Add comments and flag issues for review.",
    },
    {
      icon: Clock,
      title: "Mark Forms Ready for Submission",
      description: "Once reviewed, mark forms as ready. Business owners will handle the final submission to URA.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-12 px-4">
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-3">
            Welcome to TaxAudit Uganda, {profile?.name || "Accountant"}!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your accountant profile is ready. Here's how to get started with managing client tax filings.
          </p>
        </div>

        <div className="grid gap-6 mb-10">
          {steps.map((step, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Step {index + 1}: {step.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base ml-14">
                  {step.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold mb-1">Ready to explore?</h3>
                <p className="text-sm text-muted-foreground">
                  Visit your dashboard to see your client assignments.
                </p>
              </div>
              <Button asChild size="lg">
                <Link to="/accountant">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Need help? Check out our{" "}
          <Link to="/help" className="text-primary hover:underline">
            documentation
          </Link>{" "}
          or contact support.
        </p>
      </div>
    </div>
  );
}

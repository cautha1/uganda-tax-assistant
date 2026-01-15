import { ExternalLink, FileText, Mail, Clock, CheckCircle2, Building2, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface TINGuideProps {
  onApplyLater?: () => void;
}

export function TINGuide({ onApplyLater }: TINGuideProps) {
  const steps = [
    {
      title: "Visit URA Portal",
      description: "Go to the URA e-Services portal to start your TIN application",
      icon: ExternalLink,
    },
    {
      title: "Select 'Register for Taxes'",
      description: "Click on the tax registration option from the main menu",
      icon: FileText,
    },
    {
      title: "Choose Registration Type",
      description: "Select Individual (for sole proprietors) or Non-Individual (for companies)",
      icon: User,
    },
    {
      title: "Upload Required Documents",
      description: "Submit your National ID (NIN) and Business Registration Number (BRN) if applicable",
      icon: Building2,
    },
    {
      title: "Submit Application",
      description: "Review and submit your application for processing",
      icon: CheckCircle2,
    },
    {
      title: "Receive TIN via Email",
      description: "Your TIN will be sent to your registered email within 2 business days",
      icon: Mail,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>How to Get Your TIN</CardTitle>
        <CardDescription>
          A Taxpayer Identification Number (TIN) is required to file taxes in Uganda. Follow these steps to obtain yours from URA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Processing Time</AlertTitle>
          <AlertDescription>
            TIN applications typically take 1-2 business days to process. You'll receive your TIN via email once approved.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h4 className="font-semibold">Step-by-Step Guide</h4>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4 items-start p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-primary" />
                    <h5 className="font-medium">{step.title}</h5>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <Button asChild size="lg" className="gap-2">
            <a
              href="https://ura.go.ug/en/domestic-taxes/tin-application"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Go to URA Portal
            </a>
          </Button>
        </div>

        <Separator />

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="documents">
            <AccordionTrigger>Required Documents</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium mb-2">For Individuals (Sole Proprietors):</h5>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>National ID (NIN) - Original and copy</li>
                    <li>Passport photo</li>
                    <li>Proof of residence (utility bill, LC letter)</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">For Businesses (Companies/Partnerships):</h5>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Business Registration Number (BRN) from URSB</li>
                    <li>Certificate of Incorporation</li>
                    <li>Memorandum and Articles of Association</li>
                    <li>Directors' National IDs</li>
                    <li>Company resolution</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq">
            <AccordionTrigger>Frequently Asked Questions</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium">How long does TIN registration take?</h5>
                  <p className="text-sm text-muted-foreground">Usually 1-2 business days for online applications.</p>
                </div>
                <div>
                  <h5 className="font-medium">Is TIN registration free?</h5>
                  <p className="text-sm text-muted-foreground">Yes, TIN registration is completely free at URA.</p>
                </div>
                <div>
                  <h5 className="font-medium">Can I use someone else's TIN?</h5>
                  <p className="text-sm text-muted-foreground">No, each business and individual must have their own unique TIN.</p>
                </div>
                <div>
                  <h5 className="font-medium">What if I forgot my TIN?</h5>
                  <p className="text-sm text-muted-foreground">You can retrieve your TIN from the URA portal using your NIN or email.</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {onApplyLater && (
          <div className="pt-4 text-center">
            <Button variant="outline" onClick={onApplyLater}>
              I'll Apply for TIN Later
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Note: You won't be able to file taxes until you have a valid TIN.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

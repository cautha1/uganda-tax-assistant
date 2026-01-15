import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, AlertTriangle, CheckCircle2, Building2 } from "lucide-react";

interface InformalBusinessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
  onFormalize: () => void;
}

export function InformalBusinessModal({
  open,
  onOpenChange,
  onAcknowledge,
  onFormalize,
}: InformalBusinessModalProps) {
  const benefits = [
    "Access to formal banking and credit facilities",
    "Ability to bid for government contracts",
    "Legal protection for your business name",
    "Easier access to business financing",
    "Build business credit history",
    "Professional credibility with clients",
  ];

  const risks = [
    "Limited access to formal financial services",
    "Cannot participate in government procurement",
    "No legal protection for business name",
    "Difficulty getting business loans",
    "May face penalties for unregistered operation",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            About Informal Business Registration
          </DialogTitle>
          <DialogDescription>
            We've noticed you indicated your business is not formally registered. Here's what you should know.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert variant="destructive" className="bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Operating Without Registration</AlertTitle>
            <AlertDescription>
              While you can use this platform to prepare tax documents, operating without formal registration may limit your business opportunities and could result in penalties.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Benefits of Formalizing
              </h4>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risks of Staying Informal
              </h4>
              <ul className="space-y-2">
                {risks.map((risk, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted space-y-3">
            <h4 className="font-semibold">How to Register Your Business</h4>
            <p className="text-sm text-muted-foreground">
              Business registration in Uganda is done through URSB (Uganda Registration Services Bureau). The process typically takes 1-3 business days for simple business names.
            </p>
            <Button asChild variant="outline" className="gap-2">
              <a
                href="https://ursb.go.ug/business-registration"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Visit URSB Portal
              </a>
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onAcknowledge}>
            I Understand, Continue as Informal
          </Button>
          <Button onClick={onFormalize} className="gap-2">
            <Building2 className="h-4 w-4" />
            I'll Register My Business First
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

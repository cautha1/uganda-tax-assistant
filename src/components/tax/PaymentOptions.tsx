import { ExternalLink, Building2, Smartphone, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  instructions: string[];
  link?: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "bank",
    name: "Bank Payment",
    description: "Pay at any URA-approved bank",
    icon: <Building2 className="h-6 w-6" />,
    instructions: [
      "Visit any of the following banks:",
      "Stanbic Bank, Standard Chartered, dfcu Bank, Centenary Bank, Equity Bank, Absa Bank",
      "Present your TIN and Payment Registration Number (PRN)",
      "Pay the exact amount shown",
      "Collect your payment receipt",
    ],
  },
  {
    id: "mobile",
    name: "Mobile Money",
    description: "Pay using MTN MoMo or Airtel Money",
    icon: <Smartphone className="h-6 w-6" />,
    instructions: [
      "For MTN MoMo:",
      "Dial *165*3# → Select URA → Enter PRN → Confirm amount → Enter PIN",
      "",
      "For Airtel Money:",
      "Dial *185*9*1# → Select URA Payments → Enter PRN → Confirm → Enter PIN",
    ],
  },
  {
    id: "online",
    name: "Online Payment",
    description: "Pay via URA e-Payment portal",
    icon: <CreditCard className="h-6 w-6" />,
    instructions: [
      "Log in to your URA e-Filing account",
      "Navigate to Payments → Make Payment",
      "Enter your PRN or generate a new one",
      "Select your preferred payment method (Visa, Mastercard, Mobile Money)",
      "Complete the payment",
    ],
    link: "https://efiling.ura.go.ug",
  },
];

interface PaymentOptionsProps {
  prn?: string;
  onSelectOption?: (optionId: string) => void;
}

export function PaymentOptions({ prn, onSelectOption }: PaymentOptionsProps) {
  return (
    <div className="space-y-6">
      {/* PRN Display */}
      {prn && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-muted-foreground">Payment Registration Number (PRN)</p>
          <p className="text-xl font-mono font-bold text-primary">{prn}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use this number when making your payment
          </p>
        </div>
      )}

      {/* Payment Options */}
      <div className="space-y-4">
        <h3 className="font-semibold">Payment Methods</h3>
        
        {PAYMENT_OPTIONS.map((option) => (
          <Card key={option.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {option.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{option.name}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-1">
                {option.instructions.map((instruction, index) => (
                  <p key={index} className={instruction === "" ? "h-2" : ""}>
                    {instruction}
                  </p>
                ))}
              </div>
              
              {option.link && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onSelectOption?.(option.id);
                    window.open(option.link, "_blank");
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open URA Payment Portal
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Important Information */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="font-medium">Important Information</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• All payments must be made using your PRN</li>
          <li>• Payment reflects in URA system within 24-48 hours</li>
          <li>• Keep your payment receipt for verification</li>
          <li>• For bank payments, cash or cheque is accepted</li>
          <li>• Mobile money payments are processed instantly</li>
        </ul>
      </div>

      {/* URA Contact */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Need help? Contact URA helpline:</p>
        <p className="font-semibold">0800 117 000 (Toll-free)</p>
      </div>
    </div>
  );
}

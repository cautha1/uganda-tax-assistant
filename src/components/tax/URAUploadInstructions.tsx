import { ExternalLink, FileUp, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface URAUploadInstructionsProps {
  taxType: string;
  fileName: string;
  onStartUpload?: () => void;
}

const UPLOAD_STEPS = [
  {
    step: 1,
    title: "Log in to URA e-Filing Portal",
    description: "Visit efiling.ura.go.ug and log in with your TIN and password",
  },
  {
    step: 2,
    title: "Navigate to Returns",
    description: "Go to 'e-Services' → 'File Return' from the main menu",
  },
  {
    step: 3,
    title: "Select Tax Type",
    description: "Choose the appropriate tax type that matches your return",
  },
  {
    step: 4,
    title: "Upload Your File",
    description: "Click 'Browse' and select the generated file from your downloads",
  },
  {
    step: 5,
    title: "Review & Submit",
    description: "Verify all details are correct, then click 'Submit Return'",
  },
  {
    step: 6,
    title: "Save Acknowledgement",
    description: "Download and save the e-acknowledgement receipt for your records",
  },
];

const REQUIRED_DOCUMENTS = [
  "Generated tax return file (downloaded)",
  "Valid TIN certificate",
  "Supporting documents (invoices, receipts)",
  "Bank statements (if applicable)",
];

export function URAUploadInstructions({
  taxType,
  fileName,
  onStartUpload,
}: URAUploadInstructionsProps) {
  const { toast } = useToast();

  const copyPortalLink = () => {
    navigator.clipboard.writeText("https://efiling.ura.go.ug");
    toast({
      title: "Link copied",
      description: "URA portal link copied to clipboard",
    });
  };

  const openURAPortal = () => {
    onStartUpload?.();
    window.open("https://efiling.ura.go.ug", "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Portal Link */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary">URA e-Filing Portal</h3>
            <p className="text-sm text-muted-foreground">https://efiling.ura.go.ug</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyPortalLink}>
              <Copy className="h-4 w-4 mr-1" />
              Copy Link
            </Button>
            <Button size="sm" onClick={openURAPortal}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Portal
            </Button>
          </div>
        </div>
      </div>

      {/* File Ready Notice */}
      <Alert>
        <FileUp className="h-4 w-4" />
        <AlertDescription>
          Your <strong>{taxType}</strong> return file is ready: <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{fileName}</code>
        </AlertDescription>
      </Alert>

      {/* Step-by-Step Instructions */}
      <div className="space-y-4">
        <h3 className="font-semibold">Step-by-Step Upload Guide</h3>
        <div className="space-y-3">
          {UPLOAD_STEPS.map((item) => (
            <div
              key={item.step}
              className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                {item.step}
              </div>
              <div>
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Required Documents Checklist */}
      <div className="space-y-3">
        <h3 className="font-semibold">Required Documents Checklist</h3>
        <div className="grid gap-2">
          {REQUIRED_DOCUMENTS.map((doc, index) => (
            <label
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
            >
              <input type="checkbox" className="rounded border-input" />
              <span className="text-sm">{doc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Important Notes */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <h4 className="font-medium">Important Notes</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Keep your e-acknowledgement receipt safe - you'll upload it in the next step</li>
          <li>• Filing deadlines: PAYE & VAT by 15th of following month, Income Tax by 30th June</li>
          <li>• Late filing attracts penalties of 2% per month on tax due</li>
          <li>• Contact URA helpline: 0800 117 000 for assistance</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button className="flex-1" onClick={openURAPortal}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open URA Portal to Upload
        </Button>
      </div>
    </div>
  );
}

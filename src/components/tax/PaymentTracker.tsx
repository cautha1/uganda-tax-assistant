import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatUGX } from "@/lib/taxCalculations";
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  AlertCircle,
  CreditCard
} from "lucide-react";

interface PaymentTrackerProps {
  taxFormId: string;
  amountDue: number;
  existingPayment?: {
    id: string;
    amount_paid: number;
    status: string;
    payment_method?: string;
    payment_reference?: string;
    payment_proof_url?: string;
  };
  onPaymentRecorded: () => void;
}

const PAYMENT_METHODS = [
  { value: "bank", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "online", label: "Online Payment" },
  { value: "cash", label: "Cash at Bank" },
];

export function PaymentTracker({
  taxFormId,
  amountDue,
  existingPayment,
  onPaymentRecorded,
}: PaymentTrackerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountPaid, setAmountPaid] = useState(existingPayment?.amount_paid || 0);
  const [paymentMethod, setPaymentMethod] = useState(existingPayment?.payment_method || "");
  const [paymentReference, setPaymentReference] = useState(existingPayment?.payment_reference || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success text-success-foreground">Paid</Badge>;
      case "partial":
        return <Badge className="bg-warning text-warning-foreground">Partial</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WebP, or PDF file",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 5MB",
      });
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!paymentMethod || !paymentReference || amountPaid <= 0) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all payment details",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let proofUrl = existingPayment?.payment_proof_url || null;

      // Upload proof if provided
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `payments/${taxFormId}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("submission-proofs")
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("submission-proofs")
          .getPublicUrl(fileName);

        proofUrl = urlData.publicUrl;
      }

      // Determine payment status
      const status = amountPaid >= amountDue ? "paid" : "partial";

      if (existingPayment) {
        // Update existing payment
        const { error } = await supabase
          .from("tax_payments")
          .update({
            amount_paid: amountPaid,
            payment_method: paymentMethod,
            payment_reference: paymentReference,
            payment_proof_url: proofUrl,
            payment_date: new Date().toISOString(),
            status,
          })
          .eq("id", existingPayment.id);

        if (error) throw error;
      } else {
        // Create new payment record
        const { error } = await supabase.from("tax_payments").insert({
          tax_form_id: taxFormId,
          amount_due: amountDue,
          amount_paid: amountPaid,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_proof_url: proofUrl,
          payment_date: new Date().toISOString(),
          status,
        });

        if (error) throw error;
      }

      toast({
        title: "Payment recorded",
        description: status === "paid" 
          ? "Your payment has been recorded successfully" 
          : "Partial payment recorded. Please complete the remaining balance.",
      });

      onPaymentRecorded();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record payment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already paid in full
  if (existingPayment?.status === "paid") {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-success/10 border border-success/20 rounded-lg text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-success">Payment Complete</h3>
          <p className="text-muted-foreground">
            Amount paid: {formatUGX(existingPayment.amount_paid)}
          </p>
        </div>

        {existingPayment.payment_proof_url && (
          <div className="p-4 border rounded-lg">
            <Label className="text-muted-foreground">Payment Proof</Label>
            <a
              href={existingPayment.payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 mt-1"
            >
              <FileText className="h-4 w-4" />
              View payment receipt
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      {existingPayment && (
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Payment Status</p>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(existingPayment.status)}
              {existingPayment.status === "partial" && (
                <span className="text-sm text-muted-foreground">
                  ({formatUGX(existingPayment.amount_paid)} of {formatUGX(amountDue)} paid)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Amount Paid */}
          <div className="space-y-2">
            <Label htmlFor="amount_paid">Amount Paid (UGX) *</Label>
            <Input
              id="amount_paid"
              type="number"
              value={amountPaid || ""}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Amount due: {formatUGX(amountDue)}
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Payment Reference */}
        <div className="space-y-2">
          <Label htmlFor="payment_ref">Payment Reference Number *</Label>
          <Input
            id="payment_ref"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="e.g., TXN123456789"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Transaction ID or receipt number from your payment
          </p>
        </div>

        {/* Payment Proof Upload */}
        <div className="space-y-2">
          <Label>Payment Proof (Optional)</Label>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 hover:bg-accent/50 transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm">Upload payment receipt (optional)</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, or PDF</p>
            </button>
          ) : (
            <div className="border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded" />
                ) : (
                  <FileText className="h-10 w-10 text-muted-foreground" />
                )}
                <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !paymentMethod || !paymentReference || amountPaid <= 0}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Recording Payment...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Record Payment
          </>
        )}
      </Button>
    </div>
  );
}

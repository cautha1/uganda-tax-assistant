import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X, CheckCircle2, Image, Loader2 } from "lucide-react";

interface SubmissionProofUploadProps {
  taxFormId: string;
  businessId: string;
  onUploadComplete: (url: string, ackNumber: string) => void;
  existingProofUrl?: string;
}

export function SubmissionProofUpload({
  taxFormId,
  businessId,
  onUploadComplete,
  existingProofUrl,
}: SubmissionProofUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingProofUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [acknowledgementNumber, setAcknowledgementNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WebP, or PDF file",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 5MB",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !acknowledgementNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide the acknowledgement number and select a file",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${businessId}/${taxFormId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("submission-proofs")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("submission-proofs")
        .getPublicUrl(fileName);

      const proofUrl = urlData.publicUrl;

      // Update tax form with proof URL and acknowledgement number
      const { error: updateError } = await supabase
        .from("tax_forms")
        .update({
          submission_proof_url: proofUrl,
          ura_acknowledgement_number: acknowledgementNumber,
          ura_submission_date: new Date().toISOString(),
        })
        .eq("id", taxFormId);

      if (updateError) throw updateError;

      setUploadedUrl(proofUrl);
      onUploadComplete(proofUrl, acknowledgementNumber);

      toast({
        title: "Proof uploaded",
        description: "Your URA submission proof has been saved",
      });
    } catch (error) {
      console.error("Error uploading proof:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload proof. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (uploadedUrl) {
    return (
      <div className="space-y-4">
        <Alert className="bg-success/10 border-success/20">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            URA submission proof has been uploaded successfully
          </AlertDescription>
        </Alert>
        
        <div className="p-4 border rounded-lg space-y-3">
          <div>
            <Label className="text-muted-foreground">Acknowledgement Number</Label>
            <p className="font-mono font-medium">{acknowledgementNumber}</p>
          </div>
          
          <div>
            <Label className="text-muted-foreground">Uploaded Proof</Label>
            <a
              href={uploadedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              View uploaded document
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          After submitting your return on the URA portal, upload your e-acknowledgement 
          receipt here for record-keeping.
        </AlertDescription>
      </Alert>

      {/* Acknowledgement Number Input */}
      <div className="space-y-2">
        <Label htmlFor="ack_number">URA Acknowledgement Number *</Label>
        <Input
          id="ack_number"
          value={acknowledgementNumber}
          onChange={(e) => setAcknowledgementNumber(e.target.value)}
          placeholder="e.g., ACK-2024-123456789"
          className="font-mono"
        />
        <p className="text-sm text-muted-foreground">
          This number is shown on your URA receipt after submission
        </p>
      </div>

      {/* File Upload */}
      <div className="space-y-3">
        <Label>Upload Receipt/Screenshot *</Label>
        
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
            className="w-full border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 hover:bg-accent/50 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WebP, or PDF (max 5MB)
            </p>
          </button>
        ) : (
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <Button
        onClick={handleUpload}
        disabled={isUploading || !selectedFile || !acknowledgementNumber.trim()}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Submission Proof
          </>
        )}
      </Button>

      {/* Skip Option */}
      <p className="text-center text-sm text-muted-foreground">
        Haven't submitted to URA yet? You can skip this step and upload later.
      </p>
    </div>
  );
}

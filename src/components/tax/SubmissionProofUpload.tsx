import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";

interface SelectedFileInfo {
  id: string;
  file: File;
  previewUrl: string | null;
  documentType: string;
  description: string;
}

interface UploadedDocument {
  id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  document_type: string;
  description: string | null;
  uploaded_at: string;
}

interface SubmissionProofUploadProps {
  taxFormId: string;
  businessId: string;
  onUploadComplete: () => void;
}

const DOCUMENT_TYPES = [
  { value: "receipt", label: "Receipt" },
  { value: "invoice", label: "Invoice" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "contract", label: "Contract" },
  { value: "ura_acknowledgement", label: "URA Acknowledgement" },
  { value: "other", label: "Other" },
];

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function SubmissionProofUpload({
  taxFormId,
  businessId,
  onUploadComplete,
}: SubmissionProofUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileInfo[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Fetch existing documents on mount
  useEffect(() => {
    async function fetchDocuments() {
      try {
        const { data, error } = await supabase
          .from("tax_form_documents")
          .select("*")
          .eq("tax_form_id", taxFormId)
          .order("uploaded_at", { ascending: false });

        if (error) throw error;
        setUploadedDocuments(data || []);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setIsLoadingDocs(false);
      }
    }
    fetchDocuments();
  }, [taxFormId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_FILES - selectedFiles.length - uploadedDocuments.length;
    if (files.length > remainingSlots) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `You can only upload ${remainingSlots} more file(s). Maximum is ${MAX_FILES} total.`,
      });
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const validFiles: SelectedFileInfo[] = [];

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name}: Please upload JPG, PNG, WebP, or PDF files only`,
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name}: Maximum file size is 5MB`,
        });
        continue;
      }

      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;

      validFiles.push({
        id: crypto.randomUUID(),
        file,
        previewUrl,
        documentType: "other",
        description: "",
      });
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Reset input so same files can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeSelectedFile = (id: string) => {
    setSelectedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFileDocType = (id: string, documentType: string) => {
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, documentType } : f))
    );
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No files selected",
        description: "Please select at least one file to upload",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    const { data: { user } } = await supabase.auth.getUser();

    try {
      const newDocs: UploadedDocument[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const fileInfo = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length });

        const fileExt = fileInfo.file.name.split(".").pop();
        const fileName = `${businessId}/${taxFormId}/${crypto.randomUUID()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("submission-proofs")
          .upload(fileName, fileInfo.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: `Failed to upload ${fileInfo.file.name}`,
          });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("submission-proofs")
          .getPublicUrl(fileName);

        // Insert document record
        const { data: docData, error: insertError } = await supabase
          .from("tax_form_documents")
          .insert({
            tax_form_id: taxFormId,
            file_url: urlData.publicUrl,
            file_name: fileInfo.file.name,
            file_size: fileInfo.file.size,
            file_type: fileInfo.file.type,
            document_type: fileInfo.documentType,
            description: fileInfo.description || null,
            uploaded_by: user?.id,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          continue;
        }

        newDocs.push(docData);

        // Cleanup preview URL
        if (fileInfo.previewUrl) {
          URL.revokeObjectURL(fileInfo.previewUrl);
        }
      }

      if (newDocs.length > 0) {
        setUploadedDocuments((prev) => [...newDocs, ...prev]);
        setSelectedFiles([]);

        toast({
          title: "Documents uploaded",
          description: `Successfully uploaded ${newDocs.length} document(s)`,
        });
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "An error occurred while uploading. Please try again.",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const deleteDocument = async (doc: UploadedDocument) => {
    try {
      // Extract file path from URL
      const urlParts = doc.file_url.split("/submission-proofs/");
      const filePath = urlParts[1];

      // Delete from storage
      if (filePath) {
        await supabase.storage.from("submission-proofs").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from("tax_form_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      setUploadedDocuments((prev) => prev.filter((d) => d.id !== doc.id));

      toast({
        title: "Document deleted",
        description: "The document has been removed",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete document. Please try again.",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalFiles = selectedFiles.length + uploadedDocuments.length;
  const canAddMore = totalFiles < MAX_FILES;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Upload receipts, invoices, bank statements, or any other documents that support your tax return. 
          You can upload up to {MAX_FILES} files (max 5MB each).
        </AlertDescription>
      </Alert>

      {/* Uploaded Documents */}
      {uploadedDocuments.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Uploaded Documents ({uploadedDocuments.length})
          </Label>
          <div className="space-y-2">
            {uploadedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sm hover:underline truncate block"
                    >
                      {doc.file_name}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || "Other"} • {formatFileSize(doc.file_size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDocument(doc)}
                  className="text-destructive hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Files (pending upload) */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <Label>Files to Upload ({selectedFiles.length})</Label>
          <div className="space-y-2">
            {selectedFiles.map((fileInfo) => (
              <div
                key={fileInfo.id}
                className="p-3 border rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {fileInfo.previewUrl ? (
                      <img
                        src={fileInfo.previewUrl}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{fileInfo.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileInfo.file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSelectedFile(fileInfo.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Select
                  value={fileInfo.documentType}
                  onValueChange={(value) => updateFileDocType(fileInfo.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Add Files Button */}
      {canAddMore && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {selectedFiles.length === 0 && uploadedDocuments.length === 0
              ? "Click to add files"
              : "Add more files"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP, or PDF (max 5MB each)
          </p>
        </button>
      )}

      {!canAddMore && (
        <Alert>
          <AlertDescription>
            Maximum of {MAX_FILES} files reached. Remove some files to add more.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading {uploadProgress.current} of {uploadProgress.total}...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {selectedFiles.length} File{selectedFiles.length > 1 ? "s" : ""}
            </>
          )}
        </Button>
      )}

      {/* Continue/Skip info */}
      {uploadedDocuments.length > 0 && selectedFiles.length === 0 && (
        <Alert className="bg-success/10 border-success/20">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            {uploadedDocuments.length} document(s) uploaded. You can continue to the next step or add more files.
          </AlertDescription>
        </Alert>
      )}

      {uploadedDocuments.length === 0 && selectedFiles.length === 0 && !isLoadingDocs && (
        <p className="text-center text-sm text-muted-foreground">
          No documents yet. Upload supporting documents or skip this step.
        </p>
      )}
    </div>
  );
}

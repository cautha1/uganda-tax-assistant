import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  FileText,
  Image,
  Trash2,
  Download,
  Loader2,
  X,
} from "lucide-react";
import type { ExpenseDocument } from "@/lib/expenseCalculations";

interface ExpenseDocumentsUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  isLocked?: boolean;
  canUpload?: boolean;
}

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;

export function ExpenseDocumentsUpload({
  open,
  onOpenChange,
  expenseId,
  isLocked = false,
  canUpload = true,
}: ExpenseDocumentsUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<ExpenseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentToDelete, setDocumentToDelete] = useState<ExpenseDocument | null>(
    null
  );

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("expense_documents")
        .select("*")
        .eq("expense_id", expenseId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments((data as ExpenseDocument[]) || []);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load documents";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && expenseId) {
      fetchDocuments();
    }
  }, [open, expenseId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (documents.length + selectedFiles.length + files.length > MAX_FILES) {
      toast({
        title: "Too many files",
        description: `Maximum ${MAX_FILES} files allowed per expense`,
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter((file) => {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 5MB limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${expenseId}/${crypto.randomUUID()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("expense-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("expense-documents")
          .getPublicUrl(filePath);

        // Save document record
        const { error: dbError } = await supabase
          .from("expense_documents")
          .insert({
            expense_id: expenseId,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user.id,
          });

        if (dbError) throw dbError;

        // Log to audit trail
        await supabase.from("expense_audit_trail").insert({
          expense_id: expenseId,
          action: "document_uploaded",
          changed_by: user.id,
          new_values: { file_name: file.name, file_size: file.size },
          change_summary: `Uploaded document: ${file.name}`,
        });
      }

      toast({
        title: "Success",
        description: `${selectedFiles.length} document(s) uploaded successfully`,
      });

      setSelectedFiles([]);
      await fetchDocuments();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to upload documents";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: ExpenseDocument) => {
    if (!user) return;

    try {
      // Extract file path from URL
      const urlParts = doc.file_url.split("/");
      const filePath = urlParts.slice(-2).join("/");

      // Delete from storage
      await supabase.storage.from("expense-documents").remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from("expense_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      // Log to audit trail
      await supabase.from("expense_audit_trail").insert({
        expense_id: expenseId,
        action: "document_deleted",
        changed_by: user.id,
        previous_values: { file_name: doc.file_name },
        change_summary: `Deleted document: ${doc.file_name}`,
      });

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      await fetchDocuments();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete document";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDocumentToDelete(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expense Documents</DialogTitle>
            <DialogDescription>
              Upload receipts, invoices, or other supporting documents.
            </DialogDescription>
          </DialogHeader>

          {/* Upload Section */}
          {canUpload && !isLocked && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Upload Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_FILE_TYPES.join(",")}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(file.type)}
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeSelectedFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      documents.length + selectedFiles.length >= MAX_FILES
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select Files
                  </Button>
                  {selectedFiles.length > 0 && (
                    <Button onClick={handleUpload} disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        `Upload ${selectedFiles.length} file(s)`
                      )}
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Supported: JPG, PNG, WebP, PDF, Excel. Max 5MB per file, up to{" "}
                  {MAX_FILES} files.
                </p>
              </CardContent>
            </Card>
          )}

          {isLocked && (
            <div className="text-sm text-muted-foreground text-center py-2 bg-muted rounded-md">
              This expense is locked. Documents cannot be modified.
            </div>
          )}

          {/* Existing Documents */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Uploaded Documents ({documents.length})
            </h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No documents uploaded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(doc.file_type)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {canUpload && !isLocked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDocumentToDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!documentToDelete}
        onOpenChange={() => setDocumentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"?
              This action will be recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && handleDelete(documentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

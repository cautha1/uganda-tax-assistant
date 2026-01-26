import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Download,
  Trash2,
  Plus,
  Eye,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { IncomeDocument, Income } from "@/lib/incomeCalculations";

interface IncomeDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: Income | null;
  canUpload?: boolean;
  canDelete?: boolean;
  onDocumentsChange?: () => void;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function IncomeDocumentsDialog({
  open,
  onOpenChange,
  income,
  canUpload = true,
  canDelete = true,
  onDocumentsChange,
}: IncomeDocumentsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<IncomeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IncomeDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && income) {
      fetchDocuments();
    }
  }, [open, income?.id]);

  const fetchDocuments = async () => {
    if (!income) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("income_documents")
        .select("*")
        .eq("income_id", income.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments((data as IncomeDocument[]) || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!income || !user || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 5MB limit`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const filePath = `${income.business_id}/${income.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("income-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("income-documents")
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from("income_documents")
          .insert({
            income_id: income.id,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user.id,
          });

        if (insertError) throw insertError;

        // Log to audit trail
        await supabase.from("income_audit_trail").insert({
          income_id: income.id,
          action: "document_uploaded",
          changed_by: user.id,
          change_summary: `Uploaded document: ${file.name}`,
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    if (successCount > 0) {
      toast({
        title: "Documents uploaded",
        description: `Successfully uploaded ${successCount} document(s)`,
      });
      fetchDocuments();
      onDocumentsChange?.();
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;

    try {
      // Delete from storage
      const urlPath = new URL(deleteTarget.file_url).pathname;
      const storagePath = urlPath.split("/income-documents/")[1];
      if (storagePath) {
        await supabase.storage.from("income-documents").remove([storagePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from("income_documents")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      // Log to audit trail
      await supabase.from("income_audit_trail").insert({
        income_id: deleteTarget.income_id,
        action: "document_deleted",
        changed_by: user.id,
        change_summary: `Deleted document: ${deleteTarget.file_name}`,
      });

      toast({
        title: "Document deleted",
        description: "The document has been removed",
      });

      fetchDocuments();
      onDocumentsChange?.();
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (type.includes("pdf")) return <FileText className="h-5 w-5" />;
    if (type.includes("excel") || type.includes("spreadsheet"))
      return <FileSpreadsheet className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const canPreview = (type: string) => {
    return type.startsWith("image/") || type === "application/pdf";
  };

  if (!income) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Supporting Documents
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload Section */}
            {canUpload && !income.is_locked && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {isUploading ? "Uploading..." : "Add Document"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  PDF, JPG, PNG, Excel (max 5MB)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ALLOWED_TYPES.join(",")}
                  multiple
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* Documents List */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No documents attached</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      {getFileIcon(doc.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.file_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                          <span>•</span>
                          <span>
                            {new Date(doc.uploaded_at).toLocaleDateString("en-UG")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {canPreview(doc.file_type) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setPreviewUrl(doc.file_url)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          asChild
                        >
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {canDelete && !income.is_locked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {income.is_locked && (
              <p className="text-xs text-muted-foreground text-center">
                This month is locked. Documents cannot be added or removed.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.file_name}". This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex items-center justify-center min-h-[400px]">
              {previewUrl.endsWith(".pdf") ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] rounded-lg"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Document preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

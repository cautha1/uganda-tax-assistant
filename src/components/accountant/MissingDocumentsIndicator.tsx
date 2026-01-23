import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredDocuments, RequiredDocument, TaxType } from "@/lib/requiredDocuments";

interface MissingDocumentsIndicatorProps {
  taxFormId: string;
  taxType: TaxType;
  compact?: boolean;
}

interface DocumentStatus extends RequiredDocument {
  uploaded: boolean;
  uploadedCount: number;
}

export function MissingDocumentsIndicator({
  taxFormId,
  taxType,
  compact = false,
}: MissingDocumentsIndicatorProps) {
  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocumentStatuses();
  }, [taxFormId, taxType]);

  async function fetchDocumentStatuses() {
    setIsLoading(true);

    // Get required documents for this tax type
    const requiredDocs = getRequiredDocuments(taxType);

    // Fetch uploaded documents for this tax form
    const { data: uploadedDocs } = await supabase
      .from("tax_form_documents")
      .select("document_type")
      .eq("tax_form_id", taxFormId);

    // Count uploaded documents by type
    const uploadedCounts: Record<string, number> = {};
    uploadedDocs?.forEach((doc) => {
      if (doc.document_type) {
        uploadedCounts[doc.document_type] = (uploadedCounts[doc.document_type] || 0) + 1;
      }
    });

    // Map required documents to their status
    const statuses: DocumentStatus[] = requiredDocs.map((doc) => ({
      ...doc,
      uploaded: (uploadedCounts[doc.documentType] || 0) > 0,
      uploadedCount: uploadedCounts[doc.documentType] || 0,
    }));

    setDocumentStatuses(statuses);
    setIsLoading(false);
  }

  const requiredMissing = documentStatuses.filter((d) => d.required && !d.uploaded);
  const optionalMissing = documentStatuses.filter((d) => !d.required && !d.uploaded);
  const allUploaded = documentStatuses.filter((d) => d.uploaded);

  const overallStatus = requiredMissing.length > 0 
    ? "incomplete" 
    : optionalMissing.length > 0 
      ? "partial" 
      : "complete";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {overallStatus === "complete" && (
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            All docs uploaded
          </Badge>
        )}
        {overallStatus === "partial" && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {optionalMissing.length} optional missing
          </Badge>
        )}
        {overallStatus === "incomplete" && (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {requiredMissing.length} required missing
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Document Checklist
          {overallStatus === "complete" && (
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              Complete
            </Badge>
          )}
          {overallStatus === "partial" && (
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              Partial
            </Badge>
          )}
          {overallStatus === "incomplete" && (
            <Badge variant="destructive" className="ml-2">
              Incomplete
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Required Documents */}
        {documentStatuses.filter(d => d.required).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">REQUIRED</p>
            <div className="space-y-2">
              {documentStatuses.filter(d => d.required).map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-start gap-2 p-2 rounded-lg ${
                    doc.uploaded
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-destructive/10"
                  }`}
                >
                  {doc.uploaded ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                    {doc.uploadedCount > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        {doc.uploadedCount} file(s) uploaded
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Documents */}
        {documentStatuses.filter(d => !d.required).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">OPTIONAL</p>
            <div className="space-y-2">
              {documentStatuses.filter(d => !d.required).map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-start gap-2 p-2 rounded-lg ${
                    doc.uploaded
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-muted/50"
                  }`}
                >
                  {doc.uploaded ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-muted-foreground/30 rounded mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                    {doc.uploadedCount > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        {doc.uploadedCount} file(s) uploaded
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total uploaded</span>
            <span className="font-medium">{allUploaded.length} / {documentStatuses.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

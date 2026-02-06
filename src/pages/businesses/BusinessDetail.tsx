import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ArrowLeft, Plus, FileText, Building2, Receipt, Pencil, Trash2, Files, ExternalLink, Download, TrendingUp, BarChart3 } from "lucide-react";
import { formatUGX } from "@/lib/taxCalculations";
import { AccountantManagement } from "@/components/business/AccountantManagement";
import { PendingAccessRequests } from "@/components/business/PendingAccessRequests";
import { PendingInvitations } from "@/components/business/PendingInvitations";
import { EditBusinessDialog } from "@/components/business/EditBusinessDialog";
import { DeleteBusinessDialog } from "@/components/business/DeleteBusinessDialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { AdminIdPhotoViewer } from "@/components/business/AdminIdPhotoViewer";

interface Business {
  id: string;
  name: string;
  tin: string;
  address: string | null;
  business_type: string;
  turnover: number;
  tax_types: string[];
  is_informal: boolean;
  owner_id: string | null;
  owner_id_photo_url: string | null;
  owner_name: string | null;
}

interface TaxForm {
  id: string;
  tax_type: string;
  tax_period: string;
  status: string;
  calculated_tax: number;
  created_at: string;
}

interface TaxFormDocument {
  id: string;
  tax_form_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  document_type: string;
  description: string | null;
  uploaded_at: string;
  tax_form?: {
    tax_type: string;
    tax_period: string;
  };
}

const TAX_TYPE_LABELS: Record<string, string> = {
  paye: "PAYE",
  income: "Income Tax",
  presumptive: "Presumptive Tax",
  vat: "VAT",
  other: "Other",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  receipt: "Receipt",
  invoice: "Invoice",
  bank_statement: "Bank Statement",
  contract: "Contract",
  ura_acknowledgement: "URA Acknowledgement",
  other: "Other",
};

export default function BusinessDetail() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [taxForms, setTaxForms] = useState<TaxForm[]>([]);
  const [documents, setDocuments] = useState<TaxFormDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const isOwner = business?.owner_id === user?.id;
  const isAdmin = hasRole("admin");

  const downloadAllDocumentsAsZip = async () => {
    if (documents.length === 0) return;
    
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const fileNameCounts: Record<string, number> = {};
      
      // Fetch all files and add to zip
      const filePromises = documents.map(async (doc) => {
        try {
          const response = await fetch(doc.file_url);
          if (!response.ok) throw new Error(`Failed to fetch ${doc.file_name}`);
          
          const blob = await response.blob();
          
          // Handle duplicate file names
          let fileName = doc.file_name;
          if (fileNameCounts[fileName]) {
            fileNameCounts[fileName]++;
            const nameParts = fileName.split(".");
            const ext = nameParts.pop();
            fileName = `${nameParts.join(".")}_${fileNameCounts[fileName]}.${ext}`;
          } else {
            fileNameCounts[fileName] = 1;
          }
          
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Error fetching file ${doc.file_name}:`, error);
        }
      });
      
      await Promise.all(filePromises);
      
      // Generate ZIP and trigger download
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${business?.name || "documents"}_files.zip`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download complete",
        description: `${documents.length} document(s) downloaded as ZIP`,
      });
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Failed to create ZIP file. Please try again.",
      });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!businessId) return;

    const [businessRes, formsRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
      supabase.from("tax_forms").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(10),
    ]);

    if (businessRes.error || !businessRes.data) {
      navigate("/businesses");
      return;
    }

    setBusiness(businessRes.data as Business);
    setTaxForms((formsRes.data || []) as TaxForm[]);
    setIsLoading(false);
  }, [businessId, navigate]);

  const fetchDocuments = useCallback(async () => {
    if (!businessId) return;

    // First get all tax form IDs for this business
    const { data: taxFormIds } = await supabase
      .from("tax_forms")
      .select("id, tax_type, tax_period")
      .eq("business_id", businessId);

    if (!taxFormIds || taxFormIds.length === 0) {
      setDocuments([]);
      setIsLoadingDocs(false);
      return;
    }

    // Then get all documents for those tax forms
    const { data: docs, error } = await supabase
      .from("tax_form_documents")
      .select("*")
      .in("tax_form_id", taxFormIds.map(f => f.id))
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      setIsLoadingDocs(false);
      return;
    }

    // Map tax form info to documents
    const docsWithFormInfo = (docs || []).map(doc => ({
      ...doc,
      tax_form: taxFormIds.find(f => f.id === doc.tax_form_id),
    }));

    setDocuments(docsWithFormInfo as TaxFormDocument[]);
    setIsLoadingDocs(false);
  }, [businessId]);

  useEffect(() => {
    fetchData();
    fetchDocuments();
  }, [fetchData, fetchDocuments]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const deleteDocument = async (doc: TaxFormDocument) => {
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

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!business) return null;

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <Link to="/businesses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />Back to businesses
        </Link>

        {/* Business Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              {business.name}
            </h1>
            <p className="text-muted-foreground mt-1">TIN: {business.tin || "Not registered"}</p>
          </div>
          <div className="flex gap-2">
            {(isOwner || isAdmin) && (
              <>
                <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
            <Button asChild variant="outline">
              <Link to={`/businesses/${businessId}/income`}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Income
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/businesses/${businessId}/expenses`}>
                <Receipt className="mr-2 h-4 w-4" />
                Expenses
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/businesses/${businessId}/reports`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/businesses/${businessId}/tax/new`}>
                <Plus className="mr-2 h-4 w-4" />
                File Tax Return
              </Link>
            </Button>
          </div>
        </div>

        {/* Edit Business Dialog */}
        <EditBusinessDialog
          business={business}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={fetchData}
        />

        {/* Delete Business Dialog */}
        <DeleteBusinessDialog
          business={business}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onSuccess={() => navigate("/businesses")}
        />

        {/* Business Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Business Type</dt>
                <dd className="font-medium capitalize">{business.business_type?.replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Annual Turnover</dt>
                <dd className="font-medium">{formatUGX(business.turnover || 0)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Address</dt>
                <dd className="font-medium">{business.address || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Tax Types</dt>
                <dd className="flex gap-2 flex-wrap">
                  {business.tax_types?.map((t) => (
                    <Badge key={t} variant="secondary">{TAX_TYPE_LABELS[t] || t}</Badge>
                  ))}
                  {(!business.tax_types || business.tax_types.length === 0) && <span className="text-muted-foreground">None registered</span>}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Admin Only: ID Photo Viewer */}
        {isAdmin && (
          <div className="mb-8">
            <AdminIdPhotoViewer
              businessId={business.id}
              ownerIdPhotoUrl={business.owner_id_photo_url}
              ownerName={business.owner_name}
            />
          </div>
        )}

        {/* Pending Access Requests (for owners/admins) */}
        {(isOwner || isAdmin) && (
          <>
            <PendingAccessRequests
              businessId={business.id}
              businessName={business.name}
              onUpdate={fetchData}
            />
            <PendingInvitations
              businessId={business.id}
              onUpdate={fetchData}
            />
          </>
        )}

        {/* Accountant Management */}
        <div className="mb-8">
          <AccountantManagement
            businessId={business.id}
            businessName={business.name}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        </div>

        {/* Tax Forms & Documents Tabs */}
        <Tabs defaultValue="returns" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="returns" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Tax Returns
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <Files className="h-4 w-4" />
              Documents
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{documents.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="returns">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Tax Returns
                </CardTitle>
                <CardDescription>Recent tax filings for this business</CardDescription>
              </CardHeader>
              <CardContent>
                {taxForms.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No tax returns yet</h3>
                    <p className="text-muted-foreground mb-4">Start filing your first tax return</p>
                    <Button asChild>
                      <Link to={`/businesses/${businessId}/tax/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        File Tax Return
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {taxForms.map((form) => (
                      <Link
                        key={form.id}
                        to={`/tax/${form.id}`}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{TAX_TYPE_LABELS[form.tax_type]}</p>
                          <p className="text-sm text-muted-foreground">{form.tax_period}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={`status-${form.status}`}>{form.status}</Badge>
                          <p className="text-sm font-medium mt-1">{formatUGX(form.calculated_tax)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Files className="h-5 w-5" />
                    Supporting Documents
                  </CardTitle>
                  <CardDescription>All uploaded receipts and documents across tax filings</CardDescription>
                </div>
                {documents.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAllDocumentsAsZip}
                    disabled={isDownloadingZip}
                  >
                    {isDownloadingZip ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download All
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isLoadingDocs ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12">
                    <Files className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No documents uploaded</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload supporting documents when filing tax returns
                    </p>
                    <Button asChild>
                      <Link to={`/businesses/${businessId}/tax/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        File Tax Return
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-sm hover:underline flex items-center gap-1"
                            >
                              {doc.file_name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Badge variant="outline" className="text-xs">
                                {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                              </Badge>
                              <span>•</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.uploaded_at)}</span>
                            </div>
                            {doc.tax_form && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {TAX_TYPE_LABELS[doc.tax_form.tax_type]} - {doc.tax_form.tax_period}
                              </p>
                            )}
                          </div>
                        </div>
                        {(isOwner || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument(doc)}
                            className="text-destructive hover:text-destructive flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

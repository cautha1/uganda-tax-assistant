import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, ImageIcon, ExternalLink, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminIdPhotoViewerProps {
  businessId: string;
  ownerIdPhotoUrl: string | null;
  ownerName: string | null;
}

export function AdminIdPhotoViewer({ businessId, ownerIdPhotoUrl, ownerName }: AdminIdPhotoViewerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleViewPhoto = async () => {
    if (!ownerIdPhotoUrl) return;
    
    setIsLoading(true);
    try {
      // Extract the path from the URL
      const urlParts = ownerIdPhotoUrl.split("/identity-documents/");
      const filePath = urlParts[1];
      
      if (filePath) {
        const { data, error } = await supabase.storage
          .from("identity-documents")
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (error) throw error;
        setSignedUrl(data.signedUrl);
        setShowDialog(true);
      }
    } catch (error) {
      console.error("Error getting signed URL:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load the ID photo. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-amber-600" />
            Admin: Identity Verification
            <Badge variant="secondary" className="ml-auto">Admin Only</Badge>
          </CardTitle>
          <CardDescription>
            View the uploaded National ID for identity verification purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ownerIdPhotoUrl ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{ownerName || "Business Owner"}'s National ID</p>
                  <p className="text-sm text-muted-foreground">Uploaded during registration</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewPhoto}
                disabled={isLoading}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {isLoading ? "Loading..." : "View Photo"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p>No National ID photo has been uploaded for this business.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              National ID - {ownerName || "Business Owner"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {signedUrl && (
              <img
                src={signedUrl}
                alt="National ID"
                className="w-full rounded-lg border"
              />
            )}
            <p className="text-xs text-muted-foreground mt-3 text-center">
              This image is confidential and should only be used for identity verification purposes.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

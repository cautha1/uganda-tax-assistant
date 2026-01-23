import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Check, Clock, User, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AccessRequest {
  id: string;
  business_id: string;
  accountant_id: string;
  requested_at: string;
  status: string;
  message: string | null;
  profile: {
    name: string;
    email: string;
  } | null;
}

interface PendingAccessRequestsProps {
  businessId: string;
  businessName: string;
  onUpdate?: () => void;
}

export function PendingAccessRequests({
  businessId,
  businessName,
  onUpdate,
}: PendingAccessRequestsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Permissions for approval
  const [permissions, setPermissions] = useState({
    can_view: true,
    can_edit: true,
    can_upload: true,
    can_generate_reports: true,
  });

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .eq("business_id", businessId)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      // Fetch profile info for each request
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", request.accountant_id)
            .single();
          return { ...request, profile };
        })
      );

      setRequests(requestsWithProfiles);
    } catch (error) {
      console.error("Error fetching access requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [businessId]);

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;

    setIsProcessing(true);
    try {
      // Insert into business_accountants
      const { error: insertError } = await supabase
        .from("business_accountants")
        .insert({
          business_id: businessId,
          accountant_id: selectedRequest.accountant_id,
          assigned_by: user.id,
          ...permissions,
        });

      if (insertError) throw insertError;

      // Update request status
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // Log to audit trail
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        business_id: businessId,
        action: "access_request_approved",
        details: {
          accountant_id: selectedRequest.accountant_id,
          accountant_email: selectedRequest.profile?.email,
          permissions,
        },
      });

      toast({
        title: "Request approved",
        description: `${selectedRequest.profile?.name || "Accountant"} now has access to ${businessName}`,
      });

      setApproveDialogOpen(false);
      setSelectedRequest(null);
      fetchRequests();
      onUpdate?.();
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("access_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim() || null,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Log to audit trail
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        business_id: businessId,
        action: "access_request_rejected",
        details: {
          accountant_id: selectedRequest.accountant_id,
          accountant_email: selectedRequest.profile?.email,
          reason: rejectionReason.trim() || null,
        },
      });

      toast({
        title: "Request rejected",
        description: "The access request has been rejected",
      });

      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
      fetchRequests();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="card-elevated mb-6">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Pending Access Requests</h3>
          <Badge variant="secondary">{requests.length}</Badge>
        </div>
      </div>

      <div className="divide-y divide-border">
        {requests.map((request) => (
          <div key={request.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {request.profile?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.profile?.email}
                  </p>
                  {request.message && (
                    <p className="text-sm mt-2 bg-muted/50 rounded p-2 italic">
                      "{request.message}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Requested {formatDistanceToNow(new Date(request.requested_at))} ago
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(request);
                    setRejectDialogOpen(true);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedRequest(request);
                    setApproveDialogOpen(true);
                  }}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Approve Dialog with Permission Selection */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Access Request</DialogTitle>
            <DialogDescription>
              Select the permissions to grant to{" "}
              {selectedRequest?.profile?.name || "this accountant"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_view"
                  checked={permissions.can_view}
                  onCheckedChange={(checked) =>
                    setPermissions((p) => ({ ...p, can_view: checked as boolean }))
                  }
                />
                <Label htmlFor="can_view" className="font-normal">
                  Can view business details and tax forms
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_edit"
                  checked={permissions.can_edit}
                  onCheckedChange={(checked) =>
                    setPermissions((p) => ({ ...p, can_edit: checked as boolean }))
                  }
                />
                <Label htmlFor="can_edit" className="font-normal">
                  Can edit and create tax forms
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_upload"
                  checked={permissions.can_upload}
                  onCheckedChange={(checked) =>
                    setPermissions((p) => ({ ...p, can_upload: checked as boolean }))
                  }
                />
                <Label htmlFor="can_upload" className="font-normal">
                  Can upload supporting documents
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_generate_reports"
                  checked={permissions.can_generate_reports}
                  onCheckedChange={(checked) =>
                    setPermissions((p) => ({
                      ...p,
                      can_generate_reports: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="can_generate_reports" className="font-normal">
                  Can generate and download reports
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing && <LoadingSpinner className="h-4 w-4 mr-2" />}
              Approve Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Access Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this request from{" "}
              {selectedRequest?.profile?.name || "this accountant"}?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="rejection_reason">Reason (optional)</Label>
            <Textarea
              id="rejection_reason"
              placeholder="Provide a reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing && <LoadingSpinner className="h-4 w-4 mr-2" />}
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

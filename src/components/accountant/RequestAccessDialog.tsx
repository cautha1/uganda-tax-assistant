import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { validateTIN } from "@/lib/tinValidation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Building2, Search, Send, UserPlus } from "lucide-react";

interface BusinessInfo {
  id: string;
  name: string;
}

interface RequestAccessDialogProps {
  trigger?: React.ReactNode;
  onRequestSent?: () => void;
}

export function RequestAccessDialog({ trigger, onRequestSent }: RequestAccessDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tin, setTin] = useState("");
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foundBusiness, setFoundBusiness] = useState<BusinessInfo | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [existingRequest, setExistingRequest] = useState<string | null>(null);

  const resetForm = () => {
    setTin("");
    setMessage("");
    setFoundBusiness(null);
    setSearchError(null);
    setExistingRequest(null);
  };

  const handleSearch = async () => {
    if (!validateTIN(tin)) {
      setSearchError("Please enter a valid 10-digit TIN");
      setFoundBusiness(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setFoundBusiness(null);
    setExistingRequest(null);

    try {
      // Search for business by TIN (only return minimal info for privacy)
      const { data: business, error } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("tin", tin.replace(/\s/g, ""))
        .eq("is_deleted", false)
        .single();

      if (error || !business) {
        setSearchError("No business found with this TIN");
        return;
      }

      // Check if already assigned as accountant
      const { data: existingAssignment } = await supabase
        .from("business_accountants")
        .select("id")
        .eq("business_id", business.id)
        .eq("accountant_id", user?.id)
        .single();

      if (existingAssignment) {
        setSearchError("You already have access to this business");
        return;
      }

      // Check if there's already a pending request
      const { data: pendingRequest } = await supabase
        .from("access_requests")
        .select("id, status")
        .eq("business_id", business.id)
        .eq("accountant_id", user?.id)
        .single();

      if (pendingRequest) {
        if (pendingRequest.status === "pending") {
          setExistingRequest("You already have a pending request for this business");
          return;
        } else if (pendingRequest.status === "rejected") {
          setExistingRequest("Your previous request was rejected. Contact the business owner directly.");
          return;
        }
      }

      setFoundBusiness(business);
    } catch (error) {
      console.error("Error searching for business:", error);
      setSearchError("An error occurred while searching");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!foundBusiness || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("access_requests").insert({
        business_id: foundBusiness.id,
        accountant_id: user.id,
        message: message.trim() || null,
      });

      if (error) throw error;

      // Log to audit trail
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        business_id: foundBusiness.id,
        action: "access_requested",
        details: {
          business_name: foundBusiness.name,
          message: message.trim() || null,
        },
      });

      toast({
        title: "Request sent",
        description: `Your access request has been sent to ${foundBusiness.name}. You'll be notified when the owner responds.`,
      });

      setOpen(false);
      resetForm();
      onRequestSent?.();
    } catch (error: any) {
      console.error("Error sending request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send access request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Request Access
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Access to Business</DialogTitle>
          <DialogDescription>
            Enter the business TIN to request access. The business owner will be notified and can approve your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tin">Business TIN</Label>
            <div className="flex gap-2">
              <Input
                id="tin"
                placeholder="Enter 10-digit TIN"
                value={tin}
                onChange={(e) => {
                  setTin(e.target.value);
                  setFoundBusiness(null);
                  setSearchError(null);
                  setExistingRequest(null);
                }}
                maxLength={10}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSearch}
                disabled={isSearching || tin.length < 10}
              >
                {isSearching ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}

          {existingRequest && (
            <p className="text-sm text-warning">{existingRequest}</p>
          )}

          {foundBusiness && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{foundBusiness.name}</p>
                  <p className="text-sm text-muted-foreground">Business found</p>
                </div>
              </div>
            </div>
          )}

          {foundBusiness && (
            <div className="space-y-2">
              <Label htmlFor="message">Message to owner (optional)</Label>
              <Textarea
                id="message"
                placeholder="Introduce yourself and explain why you need access..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!foundBusiness || isSubmitting}
          >
            {isSubmitting ? (
              <LoadingSpinner className="h-4 w-4 mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

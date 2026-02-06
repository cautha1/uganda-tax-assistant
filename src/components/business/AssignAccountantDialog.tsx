import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Mail, UserPlus } from "lucide-react";

interface Business {
  id: string;
  name: string;
  tin: string;
}

interface AssignAccountantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
}

export function AssignAccountantDialog({
  open,
  onOpenChange,
  onAssigned,
}: AssignAccountantDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBusinesses, setIsFetchingBusinesses] = useState(true);
  const [step, setStep] = useState<"business" | "details">("business");

  const [permissions, setPermissions] = useState({
    can_view: true,
    can_edit: true,
    can_upload: true,
    can_generate_reports: true,
  });

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, tin")
        .eq("owner_id", user?.id)
        .eq("is_deleted", false)
        .order("name");

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setIsFetchingBusinesses(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchBusinesses();
    }
  }, [open, user]);

  const resetForm = () => {
    setSelectedBusinessId("");
    setEmail("");
    setStep("business");
    setPermissions({
      can_view: true,
      can_edit: true,
      can_upload: true,
      can_generate_reports: true,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleNext = () => {
    if (!selectedBusinessId) {
      toast({
        title: "Select a business",
        description: "Please select a business to assign the accountant to",
        variant: "destructive",
      });
      return;
    }
    setStep("details");
  };

  const handleInvite = async () => {
    if (!email.trim() || !selectedBusinessId || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-accountant-invitation", {
        body: {
          business_id: selectedBusinessId,
          accountant_email: email.trim(),
          permissions,
        },
      });

      if (error) throw error;

      if (!data.success && data.error) {
        toast({
          title: "Could not send invitation",
          description: data.error,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

      toast({
        title: "Invitation sent!",
        description: `An invitation email has been sent to ${email}`,
      });

      handleClose();
      onAssigned?.();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Accountant
          </DialogTitle>
          <DialogDescription>
            {step === "business"
              ? "Select a business to assign an accountant to."
              : "Enter the accountant's email and set their permissions."}
          </DialogDescription>
        </DialogHeader>

        {step === "business" ? (
          <>
            <div className="py-4">
              {isFetchingBusinesses ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : businesses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>You don't have any businesses yet.</p>
                  <p className="text-sm">Create a business first to assign accountants.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Business</Label>
                  <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a business..." />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((business) => (
                        <SelectItem key={business.id} value={business.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{business.name}</span>
                            <span className="text-muted-foreground text-xs">
                              (TIN: {business.tin})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!selectedBusinessId}>
                Next
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Accountant Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="accountant@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The accountant must already be registered with this email.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="perm_view"
                      checked={permissions.can_view}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({ ...p, can_view: checked as boolean }))
                      }
                    />
                    <Label htmlFor="perm_view" className="font-normal text-sm">
                      Can view business details and tax forms
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="perm_edit"
                      checked={permissions.can_edit}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({ ...p, can_edit: checked as boolean }))
                      }
                    />
                    <Label htmlFor="perm_edit" className="font-normal text-sm">
                      Can edit and create tax forms
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="perm_upload"
                      checked={permissions.can_upload}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({ ...p, can_upload: checked as boolean }))
                      }
                    />
                    <Label htmlFor="perm_upload" className="font-normal text-sm">
                      Can upload supporting documents
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="perm_reports"
                      checked={permissions.can_generate_reports}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({
                          ...p,
                          can_generate_reports: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="perm_reports" className="font-normal text-sm">
                      Can generate and download reports
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("business")}>
                Back
              </Button>
              <Button onClick={handleInvite} disabled={!email.trim() || isLoading}>
                {isLoading && <LoadingSpinner className="h-4 w-4 mr-2" />}
                Assign Accountant
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

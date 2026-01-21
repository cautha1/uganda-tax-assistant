import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Archive, Trash2 } from "lucide-react";

interface DeleteBusinessDialogProps {
  business: {
    id: string;
    name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteBusinessDialog({
  business,
  open,
  onOpenChange,
  onSuccess,
}: DeleteBusinessDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [action, setAction] = useState<"archive" | "delete">("archive");
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isConfirmed = confirmText.toLowerCase() === business.name.toLowerCase();

  const handleSubmit = async () => {
    if (!user || !isConfirmed) return;

    setIsLoading(true);

    try {
      if (action === "archive") {
        // Soft delete - set is_deleted flag
        const { error } = await supabase
          .from("businesses")
          .update({ is_deleted: true })
          .eq("id", business.id);

        if (error) throw error;

        // Log the archive action
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          business_id: business.id,
          action: "business_archived",
          details: { business_name: business.name },
        });

        toast({
          title: "Business archived",
          description: `${business.name} has been archived and hidden from your list.`,
        });
      } else {
        // Hard delete - this will fail if there are tax forms due to FK constraints
        // In practice, we should always archive, but allow delete for businesses with no history
        const { error } = await supabase
          .from("businesses")
          .delete()
          .eq("id", business.id);

        if (error) {
          if (error.code === "23503") {
            toast({
              variant: "destructive",
              title: "Cannot delete",
              description: "This business has tax records. Please archive it instead.",
            });
            setIsLoading(false);
            return;
          }
          throw error;
        }

        // Log the delete action (to a different business_id since it's deleted)
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action: "business_deleted",
          details: { business_id: business.id, business_name: business.name },
        });

        toast({
          title: "Business deleted",
          description: `${business.name} has been permanently deleted.`,
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error deleting/archiving business:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${action} business. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText("");
      setAction("archive");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Remove Business
          </AlertDialogTitle>
          <AlertDialogDescription>
            Choose how you want to remove <strong>{business.name}</strong> from your account.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={action} onValueChange={(v) => setAction(v as "archive" | "delete")}>
            <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setAction("archive")}>
              <RadioGroupItem value="archive" id="archive" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="archive" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Archive className="h-4 w-4 text-warning" />
                  Archive (Recommended)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Hide the business from your list but keep all tax records safe. You can restore it later.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setAction("delete")}>
              <RadioGroupItem value="delete" id="delete" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="delete" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  Delete Permanently
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently remove the business. This only works if there are no tax records.
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="space-y-2 pt-2">
            <Label htmlFor="confirm-name">
              Type <strong>{business.name}</strong> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter business name"
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isConfirmed || isLoading}
          >
            {isLoading ? "Processing..." : action === "archive" ? "Archive Business" : "Delete Business"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

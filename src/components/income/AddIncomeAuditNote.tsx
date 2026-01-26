import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface AddIncomeAuditNoteProps {
  incomeId: string;
  onNoteAdded: () => void;
}

export function AddIncomeAuditNote({
  incomeId,
  onNoteAdded,
}: AddIncomeAuditNoteProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !note.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await (supabase.from("income_audit_trail") as any).insert([{
        income_id: incomeId,
        action: "note_added",
        changed_by: user.id,
        change_summary: note.trim(),
      }]);

      if (error) throw error;

      toast({
        title: "Note Added",
        description: "Your audit note has been recorded.",
      });

      setNote("");
      onNoteAdded();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add note";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Add Audit Note
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="audit-note" className="sr-only">
              Note
            </Label>
            <Textarea
              id="audit-note"
              placeholder="Add a note for audit purposes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!note.trim() || isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Note"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

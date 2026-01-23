import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, StickyNote, Send } from "lucide-react";

interface AddAuditNoteProps {
  expenseId: string;
  onNoteAdded?: () => void;
}

export function AddAuditNote({ expenseId, onNoteAdded }: AddAuditNoteProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !note.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("expense_audit_trail").insert({
        expense_id: expenseId,
        action: "note_added",
        changed_by: user.id,
        change_summary: note.trim(),
        new_values: { note: note.trim() },
      });

      if (error) throw error;

      toast({
        title: "Note Added",
        description: "Your note has been added to the audit trail.",
      });

      setNote("");
      onNoteAdded?.();
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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Add Audit Note
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Add a note about this expense (e.g., verification status, discrepancies found, etc.)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !note.trim()}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Add Note
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  MessageSquare,
  FileUp,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { IncomeAuditEntry } from "@/lib/incomeCalculations";

interface IncomeAuditTrailProps {
  incomeId: string;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  created: { label: "Created", icon: Plus, variant: "default" },
  updated: { label: "Updated", icon: Pencil, variant: "secondary" },
  deleted: { label: "Deleted", icon: Trash2, variant: "destructive" },
  locked: { label: "Locked", icon: Lock, variant: "outline" },
  unlocked: { label: "Unlocked", icon: Unlock, variant: "outline" },
  note_added: { label: "Note", icon: MessageSquare, variant: "secondary" },
  document_uploaded: { label: "Doc Uploaded", icon: FileUp, variant: "outline" },
  document_deleted: { label: "Doc Deleted", icon: Trash2, variant: "destructive" },
};

export function IncomeAuditTrail({ incomeId }: IncomeAuditTrailProps) {
  const [entries, setEntries] = useState<IncomeAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditTrail() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("income_audit_trail")
          .select("*")
          .eq("income_id", incomeId)
          .order("changed_at", { ascending: false });

        if (error) throw error;
        setEntries((data as IncomeAuditEntry[]) || []);
      } catch (error) {
        console.error("Failed to load audit trail:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAuditTrail();
  }, [incomeId]);

  const exportAuditTrail = () => {
    const csvContent = [
      ["Timestamp", "Action", "Summary"].join(","),
      ...entries.map((entry) =>
        [
          new Date(entry.changed_at).toISOString(),
          entry.action,
          `"${(entry.change_summary || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `income-audit-${incomeId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Audit Trail ({entries.length})
        </CardTitle>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={exportAuditTrail}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No audit history available.
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {entries.map((entry) => {
                const config = ACTION_CONFIG[entry.action] || {
                  label: entry.action,
                  icon: History,
                  variant: "outline" as const,
                };
                const Icon = config.icon;

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-2 rounded-md bg-muted/50"
                  >
                    <div className="mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={config.variant} className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.changed_at).toLocaleString("en-UG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      {entry.change_summary && (
                        <p className="text-sm text-muted-foreground">
                          {entry.change_summary}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

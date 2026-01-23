import { useState, useEffect } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Lock,
  FileX,
  Download,
  FileText,
  StickyNote,
} from "lucide-react";
import { AddAuditNote } from "./AddAuditNote";
import type { ExpenseAuditEntry } from "@/lib/expenseCalculations";

interface ExpenseAuditTrailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  canAddNotes?: boolean;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  created: {
    label: "Created",
    icon: <Plus className="h-3 w-3" />,
    variant: "default",
  },
  updated: {
    label: "Updated",
    icon: <Pencil className="h-3 w-3" />,
    variant: "secondary",
  },
  deleted: {
    label: "Deleted",
    icon: <Trash2 className="h-3 w-3" />,
    variant: "destructive",
  },
  document_uploaded: {
    label: "Document Uploaded",
    icon: <Upload className="h-3 w-3" />,
    variant: "outline",
  },
  document_deleted: {
    label: "Document Deleted",
    icon: <FileX className="h-3 w-3" />,
    variant: "outline",
  },
  locked: {
    label: "Locked",
    icon: <Lock className="h-3 w-3" />,
    variant: "secondary",
  },
  adjustment: {
    label: "Adjustment",
    icon: <Pencil className="h-3 w-3" />,
    variant: "outline",
  },
  note_added: {
    label: "Note",
    icon: <StickyNote className="h-3 w-3" />,
    variant: "outline",
  },
};

interface AuditEntryWithUser extends ExpenseAuditEntry {
  user_name?: string;
}

export function ExpenseAuditTrail({
  open,
  onOpenChange,
  expenseId,
  canAddNotes = false,
}: ExpenseAuditTrailProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<AuditEntryWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const fetchAuditTrail = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("expense_audit_trail")
        .select("*")
        .eq("expense_id", expenseId)
        .order("changed_at", { ascending: false });

      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set((data || []).map((e) => e.changed_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);

      const entriesWithUsers = (data || []).map((entry) => ({
        ...entry,
        user_name: profileMap.get(entry.changed_by) || "Unknown User",
      }));

      setEntries(entriesWithUsers as AuditEntryWithUser[]);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load audit trail";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && expenseId) {
      fetchAuditTrail();
    }
  }, [open, expenseId]);

  const toggleExpanded = (id: string) => {
    setExpandedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const exportToCSV = () => {
    const headers = ["Date", "User", "Action", "Summary", "Previous Values", "New Values"];
    const rows = entries.map((entry) => [
      format(new Date(entry.changed_at), "yyyy-MM-dd HH:mm:ss"),
      entry.user_name || "",
      ACTION_CONFIG[entry.action]?.label || entry.action,
      entry.change_summary || "",
      entry.previous_values ? JSON.stringify(entry.previous_values) : "",
      entry.new_values ? JSON.stringify(entry.new_values) : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-audit-trail-${expenseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text("Expense Audit Trail", 14, 20);
    
    // Generated date
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, 14, 28);
    doc.text(`Expense ID: ${expenseId}`, 14, 34);

    // Table data
    const tableData = entries.map((entry) => [
      format(new Date(entry.changed_at), "dd/MM/yyyy HH:mm"),
      entry.user_name || "Unknown",
      ACTION_CONFIG[entry.action]?.label || entry.action,
      entry.change_summary?.substring(0, 50) || "-",
    ]);

    autoTable(doc, {
      head: [["Date", "User", "Action", "Summary"]],
      body: tableData,
      startY: 42,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`expense-audit-trail-${expenseId}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Audit Trail</DialogTitle>
              <DialogDescription>
                Complete history of changes for this expense.
              </DialogDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        {/* Add Note Section */}
        {canAddNotes && (
          <AddAuditNote expenseId={expenseId} onNoteAdded={fetchAuditTrail} />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No audit entries found.
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {entries.map((entry) => {
                const config = ACTION_CONFIG[entry.action] || {
                  label: entry.action,
                  icon: null,
                  variant: "outline" as const,
                };
                const hasDetails = entry.previous_values || entry.new_values;
                const isNote = entry.action === "note_added";

                return (
                  <Collapsible
                    key={entry.id}
                    open={expandedEntries.has(entry.id)}
                    onOpenChange={() => hasDetails && toggleExpanded(entry.id)}
                  >
                    <div className={`border rounded-lg p-3 ${isNote ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : ""}`}>
                      <CollapsibleTrigger
                        className="w-full"
                        disabled={!hasDetails}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={config.variant} className="gap-1">
                                {config.icon}
                                {config.label}
                              </Badge>
                              {hasDetails && (
                                <ChevronDown
                                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                                    expandedEntries.has(entry.id)
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                />
                              )}
                            </div>
                            <p className="text-sm">
                              {entry.change_summary || "No summary"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              By {entry.user_name} on{" "}
                              {format(
                                new Date(entry.changed_at),
                                "dd MMM yyyy, HH:mm"
                              )}
                            </p>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="pt-3 mt-3 border-t">
                        <div className="grid gap-3 text-sm">
                          {entry.previous_values && (
                            <div>
                              <p className="font-medium text-muted-foreground mb-1">
                                Previous Values:
                              </p>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(entry.previous_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {entry.new_values && (
                            <div>
                              <p className="font-medium text-muted-foreground mb-1">
                                New Values:
                              </p>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(entry.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  MoreVertical,
  Pencil,
  Trash2,
  Lock,
  FileText,
  AlertCircle,
  TrendingUp,
  User,
} from "lucide-react";
import {
  type Income,
  INCOME_SOURCES,
  INCOME_PAYMENT_METHODS,
  formatUGX,
} from "@/lib/incomeCalculations";

interface IncomeCardProps {
  income: Income;
  documentCount?: number;
  onEdit?: (income: Income) => void;
  onDelete?: (income: Income) => void;
  onViewDocuments?: (income: Income) => void;
  onViewAudit?: (income: Income) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function IncomeCard({
  income,
  documentCount = 0,
  onEdit,
  onDelete,
  onViewDocuments,
  onViewAudit,
  canEdit = true,
  canDelete = true,
}: IncomeCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const sourceConfig = INCOME_SOURCES[income.source] || {
    label: income.source,
    color: "hsl(var(--muted))",
  };
  const paymentConfig = INCOME_PAYMENT_METHODS[income.payment_method] || {
    label: income.payment_method,
  };

  const isLocked = income.is_locked;
  const hasDocuments = documentCount > 0;

  const handleDelete = () => {
    onDelete?.(income);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${isLocked ? "border-muted bg-muted/20" : ""}`}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            {/* Left: Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sourceConfig.color }}
                />
                <span className="font-medium truncate">{sourceConfig.label}</span>
                {isLocked && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
              </div>

              {income.source_name && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">{income.source_name}</span>
                </div>
              )}

              {income.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {income.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {new Date(income.income_date).toLocaleDateString("en-UG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {paymentConfig.label}
                </Badge>
                {!hasDocuments && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    No Invoice
                  </Badge>
                )}
                {hasDocuments && (
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 cursor-pointer hover:bg-muted"
                    onClick={() => onViewDocuments?.(income)}
                  >
                    <FileText className="h-3 w-3" />
                    {documentCount} doc{documentCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            {/* Right: Amount and actions */}
            <div className="flex items-center sm:flex-col sm:items-end gap-2 sm:gap-2">
              <div className="flex items-center gap-1 text-lg font-semibold text-primary">
                <TrendingUp className="h-4 w-4 hidden sm:block" />
                <span className="break-all">{formatUGX(income.amount)}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && !isLocked && (
                    <DropdownMenuItem onClick={() => onEdit?.(income)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onViewDocuments?.(income)}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Documents
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewAudit?.(income)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Audit Trail
                  </DropdownMenuItem>
                  {canDelete && !isLocked && (
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this income entry ({sourceConfig.label} -{" "}
              {formatUGX(income.amount)}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

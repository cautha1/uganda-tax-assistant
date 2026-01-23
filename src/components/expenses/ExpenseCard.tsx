import { useState } from "react";
import { format } from "date-fns";
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
  History,
  AlertCircle,
} from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  formatUGX,
  type Expense,
} from "@/lib/expenseCalculations";

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onViewDocuments: (expense: Expense) => void;
  onViewAuditTrail: (expense: Expense) => void;
  canEdit?: boolean;
  documentCount?: number;
}

export function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onViewDocuments,
  onViewAuditTrail,
  canEdit = true,
  documentCount = 0,
}: ExpenseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const categoryConfig = EXPENSE_CATEGORIES[expense.category];
  const paymentMethodLabel = PAYMENT_METHODS[expense.payment_method];
  const hasMissingDocs = documentCount === 0;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant="secondary"
                  style={{
                    backgroundColor: `${categoryConfig.color}20`,
                    color: categoryConfig.color,
                  }}
                >
                  {categoryConfig.label}
                </Badge>
                {expense.is_locked && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
                {hasMissingDocs && !expense.is_locked && (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                    <AlertCircle className="h-3 w-3" />
                    No Receipt
                  </Badge>
                )}
                {documentCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <FileText className="h-3 w-3" />
                    {documentCount}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-1">
                {format(new Date(expense.expense_date), "dd MMM yyyy")}
              </p>

              {expense.description && (
                <p className="text-sm truncate mb-2">{expense.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{paymentMethodLabel}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <p className="text-lg font-semibold">{formatUGX(expense.amount)}</p>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && !expense.is_locked && (
                    <DropdownMenuItem onClick={() => onEdit(expense)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onViewDocuments(expense)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Documents
                    {hasMissingDocs && (
                      <AlertCircle className="ml-auto h-3 w-3 text-amber-500" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewAuditTrail(expense)}>
                    <History className="mr-2 h-4 w-4" />
                    Audit Trail
                  </DropdownMenuItem>
                  {canEdit && !expense.is_locked && (
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action will be
              recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(expense);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

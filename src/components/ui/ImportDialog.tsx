import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { importFromExcel, importFromCSV, ImportResult } from "@/lib/exportImport";
import { useToast } from "@/hooks/use-toast";

interface ImportDialogProps<T> {
  title: string;
  description: string;
  columnMapping: Record<string, string>;
  onImport: (data: T[]) => Promise<{ success: boolean; message: string }>;
  onDownloadTemplate?: () => void;
  triggerButton?: React.ReactNode;
}

export function ImportDialog<T>({
  title,
  description,
  columnMapping,
  onImport,
  onDownloadTemplate,
  triggerButton,
}: ImportDialogProps<T>) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ImportResult<T> | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(null);

    // Preview the import
    const fileName = selectedFile.name.toLowerCase();
    let result: ImportResult<T>;

    if (fileName.endsWith(".csv")) {
      result = await importFromCSV<T>(selectedFile, columnMapping);
    } else if (
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".xlsb") ||
      fileName.endsWith(".xlsm")
    ) {
      result = await importFromExcel<T>(selectedFile, columnMapping);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a CSV or Excel file",
      });
      return;
    }

    setPreview(result);
  };

  const handleImport = async () => {
    if (!preview || preview.data.length === 0) return;

    setIsImporting(true);
    try {
      const result = await onImport(preview.data);
      if (result.success) {
        toast({
          title: "Import Successful",
          description: result.message,
        });
        setIsOpen(false);
        setFile(null);
        setPreview(null);
      } else {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="import-file">Select File</Label>
            <Input
              ref={fileInputRef}
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.xls,.xlsb,.xlsm"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: CSV, Excel (.xlsx, .xls, .xlsb, .xlsm)
            </p>
          </div>

          {/* Template Download */}
          {onDownloadTemplate && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">Need a template?</span>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={onDownloadTemplate}
                className="h-auto p-0"
              >
                Download Template
              </Button>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              {preview.success ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {preview.data.length} record(s) ready to import
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Import Errors</p>
                    <ul className="text-xs mt-1">
                      {preview.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {preview.errors.length > 0 && preview.data.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-700 rounded-lg">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Warnings</p>
                    <ul className="text-xs mt-1">
                      {preview.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!preview?.success || preview.data.length === 0 || isImporting}
          >
            {isImporting ? "Importing..." : `Import ${preview?.data.length || 0} Record(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

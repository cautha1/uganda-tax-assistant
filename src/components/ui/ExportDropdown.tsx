import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import {
  ExportOptions,
  exportToPDF,
  exportToDocx,
  exportToExcel,
  exportToCSV,
} from "@/lib/exportImport";
import { useToast } from "@/hooks/use-toast";

interface ExportDropdownProps {
  options: ExportOptions;
  disabled?: boolean;
}

export function ExportDropdown({ options, disabled }: ExportDropdownProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (
    format: "pdf" | "docx" | "xlsx" | "xls" | "csv"
  ) => {
    setIsExporting(true);
    try {
      switch (format) {
        case "pdf":
          exportToPDF(options);
          break;
        case "docx":
          await exportToDocx(options);
          break;
        case "xlsx":
        case "xls":
          exportToExcel(options, format);
          break;
        case "csv":
          exportToCSV(options);
          break;
      }
      toast({
        title: "Export Successful",
        description: `Data exported to ${format.toUpperCase()} format`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There was an error exporting the data",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="mr-2 h-4 w-4 text-red-500" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("docx")}>
          <File className="mr-2 h-4 w-4 text-blue-500" />
          Export as Word (.docx)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          Export as Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("xls")}>
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-500" />
          Export as Excel (.xls)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="mr-2 h-4 w-4 text-gray-500" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

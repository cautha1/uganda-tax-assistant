import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft, ChevronRight, X, FileText, ExternalLink } from "lucide-react";
import type { ExpenseDocument } from "@/lib/expenseCalculations";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: ExpenseDocument[];
  initialIndex?: number;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  documents,
  initialIndex = 0,
}: DocumentPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentDoc = documents[currentIndex];
  if (!currentDoc) return null;

  const isImage = currentDoc.file_type.startsWith("image/");
  const isPDF = currentDoc.file_type === "application/pdf";

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{currentDoc.file_name}</DialogTitle>
            <div className="flex items-center gap-2">
              {documents.length > 1 && (
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {documents.length}
                </span>
              )}
              <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                <a href={currentDoc.file_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                <a href={currentDoc.file_url} download={currentDoc.file_name}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex items-center justify-center min-h-[400px] max-h-[70vh] bg-muted/50">
          {/* Navigation Arrows */}
          {documents.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 h-10 w-10 rounded-full bg-background/80 hover:bg-background"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 h-10 w-10 rounded-full bg-background/80 hover:bg-background"
                onClick={goToNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Content */}
          {isImage ? (
            <img
              src={currentDoc.file_url}
              alt={currentDoc.file_name}
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : isPDF ? (
            <iframe
              src={`${currentDoc.file_url}#view=FitH`}
              className="w-full h-[70vh] border-0"
              title={currentDoc.file_name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">{currentDoc.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  Preview not available for this file type
                </p>
              </div>
              <Button asChild>
                <a href={currentDoc.file_url} download={currentDoc.file_name}>
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {documents.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto border-t">
            {documents.map((doc, index) => (
              <button
                key={doc.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                  index === currentIndex
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover:border-muted-foreground/30"
                }`}
              >
                {doc.file_type.startsWith("image/") ? (
                  <img
                    src={doc.file_url}
                    alt={doc.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

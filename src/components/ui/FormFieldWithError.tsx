import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";

interface FormFieldWithErrorProps {
  children: ReactNode;
  error?: string;
  className?: string;
}

export function FormFieldWithError({
  children,
  error,
  className,
}: FormFieldWithErrorProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-all duration-200",
          error && "[&>input]:border-destructive [&>input]:ring-destructive/20 [&>input]:ring-2"
        )}
      >
        {children}
      </div>
      {error && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive cursor-help">
                <AlertCircle className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-destructive text-destructive-foreground">
              <p>{error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

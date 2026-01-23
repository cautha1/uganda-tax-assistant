import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  History, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  User
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { formatUGX } from "@/lib/taxCalculations";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Version {
  id: string;
  tax_form_id: string;
  version_number: number;
  form_data: Record<string, unknown>;
  calculated_tax: number | null;
  changed_by: string | null;
  changed_at: string;
  change_summary: string | null;
  changed_by_name?: string;
}

interface TaxFormVersionsProps {
  taxFormId: string;
  onRestore?: (formData: Record<string, unknown>) => void;
  canRestore?: boolean;
}

export function TaxFormVersions({ taxFormId, onRestore, canRestore = false }: TaxFormVersionsProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [taxFormId]);

  async function fetchVersions() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("tax_form_versions")
      .select("*")
      .eq("tax_form_id", taxFormId)
      .order("version_number", { ascending: false });

    if (error) {
      console.error("Error fetching versions:", error);
      setIsLoading(false);
      return;
    }

    // Fetch user names
    const userIds = [...new Set((data || []).filter(v => v.changed_by).map((v) => v.changed_by as string))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);

      setVersions(
        (data || []).map((v) => ({
          ...v,
          form_data: v.form_data as Record<string, unknown>,
          changed_by_name: v.changed_by ? profileMap.get(v.changed_by) || "Unknown" : "System",
        }))
      );
    } else {
      setVersions(
        (data || []).map((v) => ({
          ...v,
          form_data: v.form_data as Record<string, unknown>,
          changed_by_name: "System",
        }))
      );
    }

    setIsLoading(false);
  }

  function handleRestore(version: Version) {
    if (onRestore) {
      onRestore(version.form_data);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Version History ({versions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No version history yet
          </p>
        ) : (
          <div className="space-y-2">
            {versions.map((version, index) => {
              const isCurrent = index === 0;
              const isExpanded = expandedVersion === version.id;

              return (
                <Collapsible
                  key={version.id}
                  open={isExpanded}
                  onOpenChange={() =>
                    setExpandedVersion(isExpanded ? null : version.id)
                  }
                >
                  <div
                    className={`border rounded-lg ${isCurrent ? "border-primary/50 bg-primary/5" : ""}`}
                  >
                    <CollapsibleTrigger className="w-full p-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={isCurrent ? "default" : "outline"}>
                            v{version.version_number}
                          </Badge>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {version.calculated_tax !== null && (
                            <span className="text-sm font-medium">
                              {formatUGX(version.calculated_tax)}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{version.changed_by_name}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(version.changed_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {version.change_summary && (
                        <p className="text-sm text-muted-foreground mt-1">
                          "{version.change_summary}"
                        </p>
                      )}
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t">
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Saved on{" "}
                            {format(new Date(version.changed_at), "PPpp")}
                          </p>
                          {/* Show a summary of form data */}
                          <div className="bg-muted/50 rounded p-2 text-xs">
                            <p className="font-medium mb-1">Form Data Summary:</p>
                            <div className="grid grid-cols-2 gap-1">
                              {Object.entries(version.form_data)
                                .slice(0, 6)
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-muted-foreground">
                                      {key.replace(/_/g, " ")}:
                                    </span>{" "}
                                    <span>
                                      {typeof value === "number"
                                        ? value.toLocaleString()
                                        : String(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                          {!isCurrent && canRestore && onRestore && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2"
                              onClick={() => handleRestore(version)}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore this version
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

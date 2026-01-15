import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, User, Mail, Phone, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  name: string | null;
  email: string | null;
  nin: string | null;
  phone: string | null;
}

interface ProfileSearchProps {
  onProfileFound: (profile: SearchResult) => void;
  onSkip: () => void;
}

export function ProfileSearch({ onProfileFound, onSkip }: ProfileSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Enter search term",
        description: "Please enter a NIN, email, or phone number to search.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.rpc("search_existing_profiles", {
        search_term: searchTerm.trim(),
      });

      if (error) throw error;

      setResults(data || []);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Unable to search profiles",
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const maskValue = (value: string | null, visibleChars: number = 4): string => {
    if (!value) return "—";
    if (value.length <= visibleChars) return value;
    return value.slice(0, visibleChars) + "****" + value.slice(-2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Existing Profile
        </CardTitle>
        <CardDescription>
          Check if you already have a profile in our system by searching with your NIN, email, or phone number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input
            placeholder="Enter NIN, email, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {hasSearched && (
          <div className="space-y-4">
            {results.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Found {results.length} matching profile(s):
                </p>
                <div className="space-y-3">
                  {results.map((profile) => (
                    <div
                      key={profile.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{profile.name || "No name"}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>{maskValue(profile.email, 3)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-3 w-3" />
                              <span>{maskValue(profile.nin, 4)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{maskValue(profile.phone, 4)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => onProfileFound(profile)}
                        >
                          This is me
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No matching profiles found.</p>
                <p className="text-sm">You can create a new profile below.</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={onSkip}>
            {hasSearched && results.length === 0
              ? "Create New Profile"
              : "Skip Search & Create New Profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  MessageSquare, 
  Plus, 
  Check, 
  HelpCircle, 
  AlertTriangle, 
  StickyNote,
  X 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  tax_form_id: string;
  field_name: string | null;
  comment: string;
  comment_type: "note" | "question" | "issue" | "resolution";
  created_by: string;
  created_at: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_by_name?: string;
}

interface TaxFormCommentsProps {
  taxFormId: string;
  fieldName?: string;
  canAdd?: boolean;
}

const COMMENT_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  note: { 
    icon: <StickyNote className="h-4 w-4" />, 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", 
    label: "Note" 
  },
  question: { 
    icon: <HelpCircle className="h-4 w-4" />, 
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", 
    label: "Question" 
  },
  issue: { 
    icon: <AlertTriangle className="h-4 w-4" />, 
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", 
    label: "Issue" 
  },
  resolution: { 
    icon: <Check className="h-4 w-4" />, 
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", 
    label: "Resolution" 
  },
};

export function TaxFormComments({ taxFormId, fieldName, canAdd = true }: TaxFormCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newCommentType, setNewCommentType] = useState<string>("note");
  const [filter, setFilter] = useState<"all" | "unresolved">("all");

  useEffect(() => {
    fetchComments();
  }, [taxFormId, fieldName]);

  async function fetchComments() {
    setIsLoading(true);
    let query = supabase
      .from("tax_form_comments")
      .select("*")
      .eq("tax_form_id", taxFormId)
      .order("created_at", { ascending: false });

    if (fieldName) {
      query = query.eq("field_name", fieldName);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching comments:", error);
      setIsLoading(false);
      return;
    }

    // Fetch user names for comments
    const userIds = [...new Set((data || []).map((c) => c.created_by))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);

      setComments(
        (data || []).map((c) => ({
          ...c,
          comment_type: c.comment_type as Comment["comment_type"],
          created_by_name: profileMap.get(c.created_by) || "Unknown",
        }))
      );
    } else {
      setComments([]);
    }

    setIsLoading(false);
  }

  async function handleAddComment() {
    if (!user || !newComment.trim()) return;

    setIsAdding(true);
    const { error } = await supabase.from("tax_form_comments").insert({
      tax_form_id: taxFormId,
      field_name: fieldName || null,
      comment: newComment.trim(),
      comment_type: newCommentType,
      created_by: user.id,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add comment",
      });
      setIsAdding(false);
      return;
    }

    toast({ title: "Comment added" });
    setNewComment("");
    setShowAddForm(false);
    setIsAdding(false);
    fetchComments();
  }

  async function handleResolve(commentId: string) {
    if (!user) return;

    const { error } = await supabase
      .from("tax_form_comments")
      .update({
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resolve comment",
      });
      return;
    }

    toast({ title: "Comment resolved" });
    fetchComments();
  }

  const filteredComments = comments.filter((c) =>
    filter === "all" ? true : !c.resolved
  );

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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments ({filteredComments.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as "all" | "unresolved")}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
              </SelectContent>
            </Select>
            {canAdd && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        {showAddForm && (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Select value={newCommentType} onValueChange={setNewCommentType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Comment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">📝 Note</SelectItem>
                <SelectItem value="question">❓ Question</SelectItem>
                <SelectItem value="issue">⚠️ Issue</SelectItem>
                <SelectItem value="resolution">✓ Resolution</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newComment.trim() || isAdding}
              >
                {isAdding ? <LoadingSpinner size="sm" /> : "Add Comment"}
              </Button>
            </div>
          </div>
        )}

        {/* Comments List */}
        {filteredComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet
          </p>
        ) : (
          <div className="space-y-3">
            {filteredComments.map((comment) => {
              const config = COMMENT_TYPE_CONFIG[comment.comment_type] || COMMENT_TYPE_CONFIG.note;
              return (
                <div
                  key={comment.id}
                  className={`p-3 border rounded-lg ${comment.resolved ? "opacity-60 bg-muted/20" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={config.color}>
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                      </Badge>
                      {comment.field_name && (
                        <Badge variant="outline" className="text-xs">
                          {comment.field_name}
                        </Badge>
                      )}
                      {comment.resolved && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <Check className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{comment.comment}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {comment.created_by_name} •{" "}
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                    {!comment.resolved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => handleResolve(comment.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

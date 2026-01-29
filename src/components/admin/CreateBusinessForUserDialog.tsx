import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Building2, Search } from "lucide-react";

const createBusinessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  tin: z.string().regex(/^\d{10}$/, "TIN must be exactly 10 digits").optional().or(z.literal("")),
  address: z.string().optional(),
  business_type: z.enum(["sole_proprietorship", "partnership", "limited_company", "ngo", "cooperative", "other"]),
  annual_turnover: z.coerce.number().min(0, "Turnover must be positive").optional(),
});

type CreateBusinessForm = z.infer<typeof createBusinessSchema>;

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface CreateBusinessForUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBusinessCreated: () => void;
}

export function CreateBusinessForUserDialog({
  open,
  onOpenChange,
  onBusinessCreated,
}: CreateBusinessForUserDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBusinessForm>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: {
      name: "",
      tin: "",
      address: "",
      business_type: "sole_proprietorship",
      annual_turnover: 0,
    },
  });

  const businessType = watch("business_type");

  // Fetch users with sme_owner role
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        // Get all users with sme_owner role
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "sme_owner");

        if (rolesError) throw rolesError;

        const userIds = rolesData?.map((r) => r.user_id) || [];

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", userIds)
            .order("name");

          if (profilesError) throw profilesError;

          setUsers(profilesData || []);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (open) {
      fetchUsers();
    }
  }, [open]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = async (data: CreateBusinessForm) => {
    if (!selectedOwnerId) {
      toast({
        title: "Error",
        description: "Please select a business owner",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("businesses").insert({
        name: data.name,
        tin: data.tin || null,
        address: data.address || null,
        business_type: data.business_type,
        annual_turnover: data.annual_turnover || 0,
        turnover: data.annual_turnover || 0,
        owner_id: selectedOwnerId,
        onboarding_completed: true,
        is_deleted: false,
      });

      if (error) throw error;

      // Log to audit trail
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "admin_created_business",
        details: {
          business_name: data.name,
          assigned_owner_id: selectedOwnerId,
          assigned_owner_email: users.find((u) => u.id === selectedOwnerId)?.email,
        },
      });

      toast({
        title: "Business Created",
        description: `Successfully created business "${data.name}"`,
      });

      reset();
      setSelectedOwnerId("");
      setSearchTerm("");
      onOpenChange(false);
      onBusinessCreated();
    } catch (error: any) {
      console.error("Error creating business:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create business",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedOwnerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Business for User
          </DialogTitle>
          <DialogDescription>
            Create a new business and assign it to an existing user
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Owner Selection */}
          <div className="space-y-2">
            <Label>Assign to Owner *</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {filteredUsers.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">
                      No users found
                    </p>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                          selectedOwnerId === u.id ? "bg-primary/10 border-l-2 border-primary" : ""
                        }`}
                        onClick={() => setSelectedOwnerId(u.id)}
                      >
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedUser && (
                <p className="text-sm text-muted-foreground">
                  Selected: <span className="font-medium">{selectedUser.name}</span> ({selectedUser.email})
                </p>
              )}
            </div>
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Business Name *</Label>
            <Input
              id="name"
              placeholder="My Business Ltd"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="business_type">Business Type *</Label>
            <Select
              value={businessType}
              onValueChange={(value: any) => setValue("business_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="limited_company">Limited Company</SelectItem>
                <SelectItem value="ngo">NGO</SelectItem>
                <SelectItem value="cooperative">Cooperative</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TIN */}
          <div className="space-y-2">
            <Label htmlFor="tin">TIN (Optional)</Label>
            <Input
              id="tin"
              placeholder="1000000000"
              maxLength={10}
              {...register("tin")}
            />
            {errors.tin && (
              <p className="text-sm text-destructive">{errors.tin.message}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              placeholder="123 Main Street, Kampala"
              {...register("address")}
            />
          </div>

          {/* Annual Turnover */}
          <div className="space-y-2">
            <Label htmlFor="annual_turnover">Annual Turnover (UGX)</Label>
            <Input
              id="annual_turnover"
              type="number"
              placeholder="0"
              {...register("annual_turnover")}
            />
            {errors.annual_turnover && (
              <p className="text-sm text-destructive">{errors.annual_turnover.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedOwnerId}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Create Business
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

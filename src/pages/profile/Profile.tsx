import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { User, Mail, Phone, CreditCard, Calendar, Save, Loader2 } from "lucide-react";
import { validateNIN, getNINError, validateUgandaPhone, getPhoneError } from "@/lib/tinValidation";

interface ProfileData {
  name: string;
  nin: string;
  phone: string;
  email: string;
  created_at: string;
}

export default function Profile() {
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nin: "",
    phone: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("name, nin, phone, email, created_at")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        setFormData({
          name: data.name || "",
          nin: data.nin || "",
          phone: data.phone || "",
        });
      }
      setIsLoading(false);
    }

    fetchProfile();
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const ninError = touched.nin && formData.nin ? getNINError(formData.nin) : null;
  const phoneError = touched.phone && formData.phone ? getPhoneError(formData.phone) : null;

  const isValid =
    formData.name.trim().length >= 2 &&
    (!formData.nin || validateNIN(formData.nin)) &&
    (!formData.phone || validateUgandaPhone(formData.phone));

  const hasChanges =
    formData.name !== (profile?.name || "") ||
    formData.nin !== (profile?.nin || "") ||
    formData.phone !== (profile?.phone || "");

  const handleSubmit = async () => {
    if (!user || !isValid) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name.trim(),
          nin: formData.nin || null,
          phone: formData.phone || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "profile_updated",
        details: {
          updated_fields: ["name", "nin", "phone"].filter(
            (f) => formData[f as keyof typeof formData] !== profile?.[f as keyof ProfileData]
          ),
        },
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: formData.name.trim(),
              nin: formData.nin || null,
              phone: formData.phone || null,
            }
          : null
      );

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-2xl py-8">
        <h1 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
          <User className="h-6 w-6" />
          My Profile
        </h1>

        {/* Account Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
            <CardDescription>Your account details (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </dt>
                <dd className="font-medium">{profile?.email || user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Account Created
                </dt>
                <dd className="font-medium">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-UG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                <User className="h-3 w-3" /> Full Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter your full name"
              />
              {formData.name.trim().length > 0 && formData.name.trim().length < 2 && (
                <p className="text-sm text-destructive">Name must be at least 2 characters</p>
              )}
            </div>

            {/* NIN */}
            <div className="space-y-2">
              <Label htmlFor="nin" className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> National ID Number (NIN)
              </Label>
              <Input
                id="nin"
                value={formData.nin}
                onChange={(e) => handleChange("nin", e.target.value.toUpperCase())}
                onBlur={() => handleBlur("nin")}
                placeholder="CM1234567890AB"
                maxLength={14}
                className={ninError ? "border-destructive" : ""}
              />
              {ninError && <p className="text-sm text-destructive">{ninError}</p>}
              <p className="text-xs text-muted-foreground">
                Format: CM followed by 12 alphanumeric characters
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                onBlur={() => handleBlur("phone")}
                placeholder="+256 7XX XXX XXX"
                className={phoneError ? "border-destructive" : ""}
              />
              {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
              <p className="text-xs text-muted-foreground">
                Format: +256XXXXXXXXX or 0XXXXXXXXX
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSubmit} disabled={!isValid || !hasChanges || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X, ScanLine, Image } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NIDScanner } from "@/components/onboarding/NIDScanner";
import { validateTIN, getTINError } from "@/lib/tinValidation";

const businessTypes = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "limited_company", label: "Limited Company" },
  { value: "ngo", label: "NGO" },
  { value: "cooperative", label: "Cooperative" },
  { value: "other", label: "Other" },
];

const taxTypes = [
  { value: "paye", label: "PAYE" },
  { value: "income", label: "Income Tax" },
  { value: "presumptive", label: "Presumptive Tax" },
  { value: "vat", label: "VAT" },
  { value: "other", label: "Other" },
];

export default function CreateBusiness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    tin: "",
    address: "",
    business_type: "sole_proprietorship",
    turnover: "",
    tax_types: [] as string[],
    is_informal: false,
  });

  const tinError = form.tin ? getTINError(form.tin) : "TIN is required";
  const isFormValid = form.name && validateTIN(form.tin) && idPhotoFile;

  const handleIdPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: "Please upload an image under 5MB" });
        return;
      }
      setIdPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setIdPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setIdPhotoFile(null);
    setIdPhotoPreview(null);
  };

  const handleScanComplete = (result: { fullName: string; nin: string }) => {
    if (result.fullName && !form.name) {
      setForm(prev => ({ ...prev, name: result.fullName }));
    }
  };

  const uploadIdPhoto = async (): Promise<string | null> => {
    if (!idPhotoFile || !user) return null;
    
    const fileExt = idPhotoFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('identity-documents')
      .upload(fileName, idPhotoFile);
    
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    
    const { data } = supabase.storage
      .from('identity-documents')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!validateTIN(form.tin)) {
      toast({ variant: "destructive", title: "Invalid TIN", description: "Please enter a valid 10-digit TIN" });
      return;
    }
    
    if (!idPhotoFile) {
      toast({ variant: "destructive", title: "Photo ID Required", description: "Please upload your National ID photo" });
      return;
    }
    
    setIsLoading(true);

    // Upload the ID photo first
    const photoUrl = await uploadIdPhoto();
    if (!photoUrl) {
      toast({ variant: "destructive", title: "Upload Failed", description: "Failed to upload ID photo. Please try again." });
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.from("businesses").insert([{
      name: form.name,
      tin: form.tin,
      address: form.address || null,
      business_type: form.business_type as "sole_proprietorship" | "partnership" | "limited_company" | "ngo" | "cooperative" | "other",
      turnover: parseFloat(form.turnover) || 0,
      tax_types: form.tax_types as ("paye" | "income" | "presumptive" | "vat" | "other")[],
      is_informal: form.is_informal,
      owner_id: user.id,
      owner_id_photo_url: photoUrl,
    }]).select().single();

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setIsLoading(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      business_id: data.id,
      action: "create_business",
      details: { business_name: form.name, has_id_photo: true },
    });

    toast({ title: "Business created!", description: "Your business has been registered." });
    navigate(`/businesses/${data.id}`);
  };

  return (
    <MainLayout>
      <div className="container max-w-2xl py-8">
        <Link to="/businesses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />Back to businesses
        </Link>
        <h1 className="text-2xl font-display font-bold mb-6">Register New Business</h1>
        
        <Alert className="mb-6">
          <AlertDescription>
            To register a business, you must provide a valid TIN (Tax Identification Number) and upload a photo of your National ID.
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo ID Upload Section */}
          <div className="form-section">
            <h2 className="font-semibold mb-4">Owner Identification *</h2>
            <p className="text-sm text-muted-foreground mb-4">Upload a clear photo of your National ID card</p>
            
            <div className="flex gap-3 mb-4">
              <Button 
                type="button"
                variant="outline" 
                className="gap-2"
                onClick={() => setScannerOpen(true)}
              >
                <ScanLine className="h-4 w-4" />
                Scan with Camera
              </Button>
              
              <Label 
                htmlFor="id-photo-upload" 
                className="inline-flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer text-sm font-medium"
              >
                <Upload className="h-4 w-4" />
                Upload Photo
              </Label>
              <Input 
                id="id-photo-upload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleIdPhotoChange}
              />
            </div>
            
            {idPhotoPreview ? (
              <div className="relative inline-block">
                <img 
                  src={idPhotoPreview} 
                  alt="ID Preview" 
                  className="max-w-xs rounded-lg border shadow-sm"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={handleRemovePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No photo uploaded yet</p>
              </div>
            )}
          </div>

          <div className="form-section">
            <h2 className="font-semibold mb-4">Basic Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tin">TIN (Tax ID) *</Label>
                <Input 
                  id="tin" 
                  value={form.tin} 
                  onChange={(e) => setForm({ ...form, tin: e.target.value })} 
                  placeholder="1000000000" 
                  maxLength={10}
                  className={tinError && form.tin ? "border-destructive" : ""}
                  required 
                />
                {tinError && form.tin && (
                  <p className="text-sm text-destructive">{tinError}</p>
                )}
                <p className="text-xs text-muted-foreground">Must be exactly 10 digits</p>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Kampala, Uganda" />
            </div>
          </div>

          <div className="form-section">
            <h2 className="font-semibold mb-4">Business Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Business Type *</Label>
                <Select value={form.business_type} onValueChange={(v) => setForm({ ...form, business_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{businessTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="turnover">Annual Turnover (UGX)</Label>
                <Input id="turnover" type="number" value={form.turnover} onChange={(e) => setForm({ ...form, turnover: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Tax Types</Label>
              <div className="flex flex-wrap gap-3">
                {taxTypes.map((t) => (
                  <label key={t.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.tax_types.includes(t.value)} onCheckedChange={(c) => setForm({ ...form, tax_types: c ? [...form.tax_types, t.value] : form.tax_types.filter((x) => x !== t.value) })} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Checkbox id="informal" checked={form.is_informal} onCheckedChange={(c) => setForm({ ...form, is_informal: c as boolean })} />
              <Label htmlFor="informal" className="cursor-pointer">This is an informal/unregistered business</Label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/businesses")}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !isFormValid}>
              {isLoading ? "Creating..." : "Create Business"}
            </Button>
          </div>
        </form>
      </div>
      
      <NIDScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScanComplete={handleScanComplete}
      />
    </MainLayout>
  );
}

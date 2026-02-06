import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Phone, CreditCard, AlertCircle, ScanLine, Upload, X, ImageIcon } from "lucide-react";
import { validateNIN, validateUgandaPhone, getNINError, getPhoneError } from "@/lib/tinValidation";
import { NIDScanner } from "./NIDScanner";
import { useTranslation } from "@/hooks/useTranslation";

export interface OwnerFormData {
  ownerName: string;
  ownerNin: string;
  ownerEmail: string;
  ownerPhone: string;
  idPhotoFile?: File | null;
}

interface BusinessOwnerFormProps {
  data: OwnerFormData;
  onChange: (data: OwnerFormData) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export function BusinessOwnerForm({ data, onChange, onNext, isLoading }: BusinessOwnerFormProps) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }
      onChange({ ...data, idPhotoFile: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    onChange({ ...data, idPhotoFile: null });
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleChange = (field: keyof OwnerFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
  };

  const handleScanComplete = (result: { fullName: string; nin: string }) => {
    const updates: Partial<OwnerFormData> = {};
    
    if (result.fullName && !data.ownerName) {
      updates.ownerName = result.fullName;
    }
    
    if (result.nin && !data.ownerNin) {
      updates.ownerNin = result.nin;
    }
    
    if (Object.keys(updates).length > 0) {
      onChange({ ...data, ...updates });
    }
  };

  const errors = {
    ownerName: !data.ownerName ? t('businessOwner.errors.nameRequired') : null,
    ownerNin: touched.ownerNin ? getNINError(data.ownerNin) : null,
    ownerEmail: !data.ownerEmail 
      ? t('businessOwner.errors.emailRequired')
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.ownerEmail) 
        ? t('businessOwner.errors.emailInvalid')
        : null,
    ownerPhone: touched.ownerPhone ? getPhoneError(data.ownerPhone) : null,
  };

  const isValid = 
    data.ownerName && 
    data.ownerEmail && 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.ownerEmail) &&
    validateNIN(data.ownerNin) && 
    validateUgandaPhone(data.ownerPhone) &&
    data.idPhotoFile;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('businessOwner.title')}
          </CardTitle>
          <CardDescription>
            {t('businessOwner.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('businessOwner.uraNotice')}
            </AlertDescription>
          </Alert>

          {/* Scan NID Button */}
          <div className="flex justify-center">
            <Button 
              type="button"
              variant="outline" 
              size="lg"
              className="gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine className="h-5 w-5" />
              {t('businessOwner.scanNationalID')}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('common.or')}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ownerName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('businessOwner.fullName')}
              </Label>
              <Input
                id="ownerName"
                placeholder={t('businessOwner.fullNamePlaceholder')}
                value={data.ownerName}
                onChange={(e) => handleChange("ownerName", e.target.value)}
                onBlur={() => handleBlur("ownerName")}
                className={touched.ownerName && errors.ownerName ? "border-destructive" : ""}
              />
              {touched.ownerName && errors.ownerName && (
                <p className="text-sm text-destructive">{errors.ownerName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerNin" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t('businessOwner.nin')}
              </Label>
              <Input
                id="ownerNin"
                placeholder={t('businessOwner.ninPlaceholder')}
                value={data.ownerNin}
                onChange={(e) => handleChange("ownerNin", e.target.value.toUpperCase())}
                onBlur={() => handleBlur("ownerNin")}
                className={touched.ownerNin && errors.ownerNin ? "border-destructive" : ""}
                maxLength={14}
              />
              {touched.ownerNin && errors.ownerNin && (
                <p className="text-sm text-destructive">{errors.ownerNin}</p>
              )}
              <p className="text-xs text-muted-foreground">{t('businessOwner.ninFormat')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('businessOwner.email')}
              </Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder={t('businessOwner.emailPlaceholder')}
                value={data.ownerEmail}
                onChange={(e) => handleChange("ownerEmail", e.target.value)}
                onBlur={() => handleBlur("ownerEmail")}
                className={touched.ownerEmail && errors.ownerEmail ? "border-destructive" : ""}
              />
              {touched.ownerEmail && errors.ownerEmail && (
                <p className="text-sm text-destructive">{errors.ownerEmail}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerPhone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t('businessOwner.phone')}
              </Label>
              <Input
                id="ownerPhone"
                placeholder={t('businessOwner.phonePlaceholder')}
                value={data.ownerPhone}
                onChange={(e) => handleChange("ownerPhone", e.target.value)}
                onBlur={() => handleBlur("ownerPhone")}
                className={touched.ownerPhone && errors.ownerPhone ? "border-destructive" : ""}
              />
              {touched.ownerPhone && errors.ownerPhone && (
                <p className="text-sm text-destructive">{errors.ownerPhone}</p>
              )}
              <p className="text-xs text-muted-foreground">{t('businessOwner.phoneFormat')}</p>
            </div>
          </div>

          {/* National ID Photo Upload */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              National ID Photo <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Upload a clear photo of your National ID (front side). This is required for identity verification.
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative inline-block">
                <img
                  src={photoPreview}
                  alt="National ID Preview"
                  className="max-w-[300px] max-h-[200px] rounded-lg border object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={removePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                  className="gap-2"
                >
                  <ScanLine className="h-4 w-4" />
                  Use Camera
                </Button>
              </div>
            )}
            
            {touched.idPhoto && !data.idPhotoFile && (
              <p className="text-sm text-destructive">National ID photo is required</p>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={onNext} disabled={!isValid || isLoading}>
              {t('businessOwner.continue')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <NIDScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScanComplete={handleScanComplete}
      />
    </>
  );
}

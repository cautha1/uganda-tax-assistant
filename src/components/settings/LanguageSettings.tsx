import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function LanguageSettings() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('settings.language.title')}
          </CardTitle>
          <CardDescription>{t('settings.language.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">{t('settings.language.selectLanguage')}</h4>
              <LanguageSwitcher variant="full" />
            </div>

            <div className="rounded-lg border p-4 bg-muted/30">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                {t('settings.language.currentLanguage')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {language === 'en' ? t('language.english') : t('language.luganda')}
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="text-sm font-medium mb-2">{t('settings.language.about')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('settings.language.aboutDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

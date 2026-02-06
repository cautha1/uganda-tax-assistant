import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, User, Globe, Bell, Shield, LogOut } from "lucide-react";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { LanguageSettings } from "@/components/settings/LanguageSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { AccountSettings } from "@/components/settings/AccountSettings";

export default function Settings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold">{t('settings.title')}</h1>
            <p className="text-muted-foreground">{t('settings.subtitle')}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-2.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2 py-2.5">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.language')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-2.5">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.notifications')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 py-2.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.security')}</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2 py-2.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.account')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="language" className="space-y-6 mt-6">
            <LanguageSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 mt-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-6">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="account" className="space-y-6 mt-6">
            <AccountSettings />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

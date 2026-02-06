import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, Calendar, AlertCircle, FileText } from "lucide-react";

export function NotificationSettings() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState({
    emailDeadlines: true,
    emailFormUpdates: true,
    emailAccountantActivity: false,
    emailWeeklyDigest: true,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('settings.notifications.emailTitle')}
          </CardTitle>
          <CardDescription>{t('settings.notifications.emailDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Tax Deadline Reminders */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="emailDeadlines" className="font-medium">
                    {t('settings.notifications.deadlineReminders')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.notifications.deadlineRemindersDesc')}
                  </p>
                </div>
              </div>
              <Switch
                id="emailDeadlines"
                checked={notifications.emailDeadlines}
                onCheckedChange={() => handleToggle("emailDeadlines")}
              />
            </div>

            {/* Form Updates */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="emailFormUpdates" className="font-medium">
                    {t('settings.notifications.formUpdates')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.notifications.formUpdatesDesc')}
                  </p>
                </div>
              </div>
              <Switch
                id="emailFormUpdates"
                checked={notifications.emailFormUpdates}
                onCheckedChange={() => handleToggle("emailFormUpdates")}
              />
            </div>

            {/* Accountant Activity */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="emailAccountantActivity" className="font-medium">
                    {t('settings.notifications.accountantActivity')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.notifications.accountantActivityDesc')}
                  </p>
                </div>
              </div>
              <Switch
                id="emailAccountantActivity"
                checked={notifications.emailAccountantActivity}
                onCheckedChange={() => handleToggle("emailAccountantActivity")}
              />
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="emailWeeklyDigest" className="font-medium">
                    {t('settings.notifications.weeklyDigest')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.notifications.weeklyDigestDesc')}
                  </p>
                </div>
              </div>
              <Switch
                id="emailWeeklyDigest"
                checked={notifications.emailWeeklyDigest}
                onCheckedChange={() => handleToggle("emailWeeklyDigest")}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              {t('settings.notifications.note')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

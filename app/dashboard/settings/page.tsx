'use client';

import { useEffect, useState } from 'react';
import { User, Building2, Clock, Mail, Bell, Shield, Check, Globe, Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { apiRequest, MailForgeApiError } from '@/lib/api';

const timezones = [
  'UTC', 'Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney',
];

type Notifications = {
  emailBounces: boolean;
  domainExpiring: boolean;
  quotaThreshold: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
};

type SettingsPayload = {
  profile: { fullName: string; email: string };
  workspace: { name: string; plan: string };
  settings: {
    timezone: string;
    dateFormat: 'mdy' | 'dmy' | 'ymd';
    defaultSenderEmail: string;
    defaultSenderName: string;
    notifications: Notifications;
  };
};

const defaultNotifications: Notifications = {
  emailBounces: true,
  domainExpiring: true,
  quotaThreshold: true,
  weeklyDigest: false,
  securityAlerts: true,
};

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [plan, setPlan] = useState('free');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [dateFormat, setDateFormat] = useState<'mdy' | 'dmy' | 'ymd'>('dmy');
  const [defaultSender, setDefaultSender] = useState('');
  const [defaultSenderName, setDefaultSenderName] = useState('MailForge');
  const [notifications, setNotifications] = useState<Notifications>(defaultNotifications);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<SettingsPayload>('/v1/settings')
      .then((result) => {
        if (!active) return;
        setName(result.profile.fullName);
        setEmail(result.profile.email);
        setWorkspaceName(result.workspace.name);
        setPlan(result.workspace.plan);
        setTimezone(result.settings.timezone);
        setDateFormat(result.settings.dateFormat);
        setDefaultSender(result.settings.defaultSenderEmail);
        setDefaultSenderName(result.settings.defaultSenderName);
        setNotifications(result.settings.notifications);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load settings.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const result = await apiRequest<SettingsPayload>('/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: name,
          workspaceName,
          timezone,
          dateFormat,
          defaultSenderEmail: defaultSender,
          defaultSenderName,
          notifications,
        }),
      });
      setName(result.profile.fullName);
      setWorkspaceName(result.workspace.name);
      setPlan(result.workspace.plan);
      setTimezone(result.settings.timezone);
      setDateFormat(result.settings.dateFormat);
      setDefaultSender(result.settings.defaultSenderEmail);
      setDefaultSenderName(result.settings.defaultSenderName);
      setNotifications(result.settings.notifications);
      setSaved(true);
    } catch (err) {
      setError(err instanceof MailForgeApiError ? err.message : err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account profile, workspace configuration, and notification preferences."
        action={
          <Button onClick={handleSave} size="sm" disabled={loading || saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : saved ? <><Check className="h-4 w-4" /> Saved</> : 'Save Changes'}
          </Button>
        }
      />

      {error && <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
      {saved && <div role="status" className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-foreground">Your settings have been saved to your MailForge workspace.</div>}
      {loading ? (
        <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your settings…</Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Account Profile</h3></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" value={email} disabled className="opacity-60" /><p className="text-xs text-muted-foreground">Email address changes are not available yet.</p></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Workspace Settings</h3></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="wsname">Workspace name</Label><Input id="wsname" value={workspaceName} maxLength={80} onChange={(e) => setWorkspaceName(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="plan">Plan</Label><Input id="plan" value={plan} disabled className="capitalize opacity-60" /></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Time Zone & Locale</h3></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Time zone</Label><Select value={timezone} onValueChange={setTimezone}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{timezones.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Date format</Label><Select value={dateFormat} onValueChange={(value) => setDateFormat(value as 'mdy' | 'dmy' | 'ymd')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mdy">MM/DD/YYYY</SelectItem><SelectItem value="dmy">DD/MM/YYYY</SelectItem><SelectItem value="ymd">YYYY-MM-DD</SelectItem></SelectContent></Select></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Default Sender Preferences</h3></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="senderemail">Default sender email</Label><Input id="senderemail" type="email" placeholder="noreply@example.com" value={defaultSender} onChange={(e) => setDefaultSender(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="sendername">Default sender name</Label><Input id="sendername" maxLength={100} value={defaultSenderName} onChange={(e) => setDefaultSenderName(e.target.value)} /></div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-md bg-secondary/30 p-3"><Globe className="h-4 w-4 shrink-0 text-muted-foreground" /><p className="text-xs text-muted-foreground">Your default sender is a saved preference. The address must be authorized by your SMTP provider and the sender domain must be verified before use.</p></div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3></div>
            <p className="mb-2 text-xs text-muted-foreground">These preferences are saved to your workspace. Notification delivery is not enabled yet.</p>
            <div className="space-y-1">
              {[
                { key: 'emailBounces' as const, label: 'Email bounce alerts', desc: 'Get notified when emails bounce' },
                { key: 'domainExpiring' as const, label: 'Domain verification expiry', desc: 'Alert when DNS records expire or change' },
                { key: 'quotaThreshold' as const, label: 'Quota threshold warning', desc: 'Alert when usage reaches 85% of limit' },
                { key: 'weeklyDigest' as const, label: 'Weekly digest', desc: 'Summary of delivery stats every Monday' },
                { key: 'securityAlerts' as const, label: 'Security alerts', desc: 'Notify on API key usage from new IPs' },
              ].map((item, idx) => <div key={item.key}>{idx > 0 && <Separator className="my-0" />}<div className="flex items-center justify-between py-3"><div><p className="text-sm font-medium text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div><Switch checked={notifications[item.key]} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [item.key]: checked }))} /></div></div>)}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Account Security</h3></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-3"><div><p className="text-sm font-medium text-foreground">Two-factor authentication</p><p className="text-xs text-muted-foreground">Multi-factor sign-in is not available yet.</p></div><Button variant="outline" size="sm" disabled>Coming soon</Button></div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3"><div><p className="text-sm font-medium text-foreground">Password</p><p className="text-xs text-muted-foreground">Password changes are not available in Settings yet.</p></div><Button variant="outline" size="sm" disabled>Coming soon</Button></div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3"><div><p className="text-sm font-medium text-foreground">Active sessions</p><p className="text-xs text-muted-foreground">Session management is not available yet.</p></div><Button variant="outline" size="sm" disabled>Coming soon</Button></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

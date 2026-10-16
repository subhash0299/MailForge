'use client';

import { useState } from 'react';
import {
  User,
  Building2,
  Clock,
  Mail,
  Bell,
  Shield,
  Check,
  Globe,
} from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { MockDataBanner } from '@/components/dashboard/feedback';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { mockUser, mockWorkspace } from '@/lib/mock-data';

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export default function SettingsPage() {
  const [name, setName] = useState(mockUser.name);
  const [email] = useState(mockUser.email);
  const [workspaceName, setWorkspaceName] = useState(mockWorkspace.name);
  const [timezone, setTimezone] = useState('America/New_York');
  const [defaultSender, setDefaultSender] = useState('no-reply@mailforge.dev');
  const [defaultSenderName, setDefaultSenderName] = useState('MailForge');
  const [saved, setSaved] = useState(false);

  const [notifications, setNotifications] = useState({
    emailBounces: true,
    domainExpiring: true,
    quotaThreshold: true,
    weeklyDigest: false,
    securityAlerts: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account profile, workspace configuration, and notification preferences."
        action={
          <Button onClick={handleSave} size="sm">
            {saved ? <><Check className="h-4 w-4" /> Saved</> : 'Save Changes'}
          </Button>
        }
      />
      <MockDataBanner />

      <div className="space-y-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Account Profile</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" value={email} disabled className="opacity-60" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Workspace Settings</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wsname">Workspace name</Label>
              <Input id="wsname" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Input value={mockWorkspace.plan} disabled className="opacity-60" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Time Zone & Locale</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Time zone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date format</Label>
              <Select defaultValue="mdy">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Default Sender Preferences</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="senderemail">Default sender email</Label>
              <Input id="senderemail" value={defaultSender} onChange={(e) => setDefaultSender(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendername">Default sender name</Label>
              <Input id="sendername" value={defaultSenderName} onChange={(e) => setDefaultSenderName(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md bg-secondary/30 p-3">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              The sender domain must be verified in Sending Domains before emails can be sent.
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
          </div>
          <div className="space-y-1">
            {[
              { key: 'emailBounces', label: 'Email bounce alerts', desc: 'Get notified when emails bounce' },
              { key: 'domainExpiring', label: 'Domain verification expiry', desc: 'Alert when DNS records expire or change' },
              { key: 'quotaThreshold', label: 'Quota threshold warning', desc: 'Alert when usage reaches 85% of limit' },
              { key: 'weeklyDigest', label: 'Weekly digest', desc: 'Summary of delivery stats every Monday' },
              { key: 'securityAlerts', label: 'Security alerts', desc: 'Notify on API key usage from new IPs' },
            ].map((item, idx) => (
              <div key={item.key}>
                {idx > 0 && <Separator className="my-0" />}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Account Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active sessions</p>
                <p className="text-xs text-muted-foreground">2 active sessions on different devices</p>
              </div>
              <Button variant="outline" size="sm">View</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

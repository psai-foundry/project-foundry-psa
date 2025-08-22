
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Clock,
  Mail,
  Save,
  Zap
} from 'lucide-react';

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [timesheetReminders, setTimesheetReminders] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = () => {
    toast.info('Test notification sent! Check your email.');
  };

  const handleResetSettings = () => {
    setEmailNotifications(true);
    setTimesheetReminders(true);
    setWeeklyReports(false);
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* PSA Settings Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger 
            value="profile" 
            className="flex items-center"
            onClick={() => setActiveTab('profile')}
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="flex items-center"
            onClick={() => setActiveTab('notifications')}
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="timesheet" 
            className="flex items-center"
            onClick={() => setActiveTab('timesheet')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Timesheet
          </TabsTrigger>
          <TabsTrigger 
            value="system" 
            className="flex items-center"
            onClick={() => setActiveTab('system')}
          >
            <Settings className="w-4 h-4 mr-2" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Enter last name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="Enter email address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" placeholder="Enter department" />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSaveSettings} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={handleResetSettings}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive general notifications via email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Timesheet Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded to submit your timesheets
                  </p>
                </div>
                <Switch
                  checked={timesheetReminders}
                  onCheckedChange={setTimesheetReminders}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly utilization reports
                  </p>
                </div>
                <Switch
                  checked={weeklyReports}
                  onCheckedChange={setWeeklyReports}
                />
              </div>

              <div className="flex space-x-2 pt-4 border-t">
                <Button onClick={handleSaveSettings} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Preferences'}
                </Button>
                <Button variant="outline" onClick={handleTestNotification}>
                  <Mail className="w-4 h-4 mr-2" />
                  Test Notification
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheet" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Timesheet Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultHours">Default Hours per Day</Label>
                  <Input id="defaultHours" type="number" placeholder="8" min="1" max="24" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeIncrement">Time Increment (minutes)</Label>
                  <Input id="timeIncrement" type="number" placeholder="15" min="5" max="60" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" placeholder="UTC" />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSaveSettings} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center py-8">
                  <Shield className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">System Status: Operational</h3>
                  <p className="text-muted-foreground mb-6">
                    PSA Timesheet System is running normally. All core functions are available.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-green-600 font-semibold">✓ Database</div>
                      <div className="text-sm text-muted-foreground">Connected</div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-green-600 font-semibold">✓ API Services</div>
                      <div className="text-sm text-muted-foreground">Operational</div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-green-600 font-semibold">✓ Authentication</div>
                      <div className="text-sm text-muted-foreground">Active</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button onClick={() => toast.success('System check completed successfully!')}>
                    <Zap className="w-4 h-4 mr-2" />
                    Run System Check
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

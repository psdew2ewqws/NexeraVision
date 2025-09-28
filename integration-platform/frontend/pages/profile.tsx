import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  Key,
  Webhook,
  Activity,
  Shield,
  Bell,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Save,
  X
} from 'lucide-react';
import {
  UserProfile,
  ApiKey,
  WebhookEndpoint,
  ActivityLog,
  NotificationPreferences,
  SecuritySettings,
  ProfileUpdateForm,
  PasswordChangeForm,
  ApiKeyForm,
  WebhookForm,
  ApiResponse
} from '@/types';

// API functions
const fetchUserProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<ApiResponse<UserProfile>>('/user/profile');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch profile');
  }
  return response.data.data;
};

const fetchApiKeys = async (): Promise<ApiKey[]> => {
  const response = await apiClient.get<ApiResponse<ApiKey[]>>('/user/api-keys');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch API keys');
  }
  return response.data.data;
};

const fetchWebhooks = async (): Promise<WebhookEndpoint[]> => {
  const response = await apiClient.get<ApiResponse<WebhookEndpoint[]>>('/user/webhooks');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch webhooks');
  }
  return response.data.data;
};

const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  const response = await apiClient.get<ApiResponse<ActivityLog[]>>('/user/activity');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch activity logs');
  }
  return response.data.data;
};

const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await apiClient.get<ApiResponse<NotificationPreferences>>('/user/notifications');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch notification preferences');
  }
  return response.data.data;
};

const fetchSecuritySettings = async (): Promise<SecuritySettings> => {
  const response = await apiClient.get<ApiResponse<SecuritySettings>>('/user/security');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch security settings');
  }
  return response.data.data;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null);

  // Fetch data
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: fetchUserProfile,
    enabled: !!user,
  });

  const { data: apiKeys = [], isLoading: apiKeysLoading, refetch: refetchApiKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: fetchApiKeys,
    enabled: !!user,
  });

  const { data: webhooks = [], isLoading: webhooksLoading, refetch: refetchWebhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: fetchWebhooks,
    enabled: !!user,
  });

  const { data: activityLogs = [], isLoading: activityLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: fetchActivityLogs,
    enabled: !!user,
  });

  const { data: notificationPrefs, isLoading: notificationLoading, refetch: refetchNotifications } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchNotificationPreferences,
    enabled: !!user,
  });

  const { data: securitySettings, isLoading: securityLoading, refetch: refetchSecurity } = useQuery({
    queryKey: ['security-settings'],
    queryFn: fetchSecuritySettings,
    enabled: !!user,
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileUpdateForm>({
    name: '',
    email: '',
    phone: '',
    timezone: '',
    language: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // API Key form state
  const [apiKeyForm, setApiKeyForm] = useState<ApiKeyForm>({
    name: '',
    permissions: [],
    expires_at: '',
  });

  // Webhook form state
  const [webhookForm, setWebhookForm] = useState<WebhookForm>({
    name: '',
    url: '',
    events: [],
    secret: '',
  });

  // Initialize profile form when profile data loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        timezone: profile.timezone,
        language: profile.language,
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateForm) => {
      const response = await apiClient.put('/user/profile', data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update profile');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      setIsEditingProfile(false);
      refetchProfile();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeForm) => {
      const response = await apiClient.post('/user/change-password', data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to change password');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowPasswordDialog(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      refetchSecurity();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password');
    },
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (data: ApiKeyForm) => {
      const response = await apiClient.post('/user/api-keys', data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create API key');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('API key created successfully');
      setShowApiKeyDialog(false);
      setApiKeyForm({ name: '', permissions: [], expires_at: '' });
      refetchApiKeys();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create API key');
    },
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/user/api-keys/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete API key');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('API key deleted successfully');
      refetchApiKeys();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete API key');
    },
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (data: WebhookForm) => {
      const response = await apiClient.post('/user/webhooks', data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create webhook');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Webhook created successfully');
      setShowWebhookDialog(false);
      setWebhookForm({ name: '', url: '', events: [], secret: '' });
      refetchWebhooks();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create webhook');
    },
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/user/webhooks/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete webhook');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Webhook deleted successfully');
      refetchWebhooks();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete webhook');
    },
  });

  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationPreferences) => {
      const response = await apiClient.put('/user/notifications', data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update notifications');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Notification preferences updated');
      refetchNotifications();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update notifications');
    },
  });

  // Toggle 2FA mutation
  const toggle2FAMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiClient.post('/user/2fa/toggle', { enabled });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to toggle 2FA');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('2FA settings updated');
      refetchSecurity();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update 2FA');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate(passwordForm);
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createApiKeyMutation.mutate(apiKeyForm);
  };

  const handleWebhookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWebhookMutation.mutate(webhookForm);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load profile information. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={profile.email_verified ? 'default' : 'secondary'}>
            {profile.email_verified ? 'Verified' : 'Unverified'}
          </Badge>
          <Badge variant="outline">{profile.role.replace('_', ' ').toUpperCase()}</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Personal Information</CardTitle>
              <Button
                variant={isEditingProfile ? 'outline' : 'default'}
                size="sm"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                {isEditingProfile ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditingProfile}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditingProfile}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditingProfile}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={profileForm.timezone}
                      onValueChange={(value) => setProfileForm(prev => ({ ...prev, timezone: value }))}
                      disabled={!isEditingProfile}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Dubai">Dubai</SelectItem>
                        <SelectItem value="Asia/Riyadh">Riyadh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={profileForm.language}
                      onValueChange={(value) => setProfileForm(prev => ({ ...prev, language: value }))}
                      disabled={!isEditingProfile}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {isEditingProfile && (
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account ID</span>
                  <span className="text-sm font-mono">{profile.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Role</span>
                  <Badge variant="outline">{profile.role.replace('_', ' ').toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="text-sm">{formatDate(profile.created_at)}</span>
                </div>
                {profile.last_login && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Login</span>
                    <span className="text-sm">{formatDate(profile.last_login)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveTab('security')}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Security Settings
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveTab('api-keys')}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Manage API Keys
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>API Keys</CardTitle>
                <p className="text-sm text-gray-600">
                  Manage your API keys for programmatic access
                </p>
              </div>
              <Button onClick={() => setShowApiKeyDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </CardHeader>
            <CardContent>
              {apiKeysLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No API keys created yet. Create your first API key to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {key.key.slice(0, 8)}...{key.key.slice(-4)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(key.key)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.permissions.map((perm) => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {key.last_used ? formatDate(key.last_used) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={key.is_active ? 'default' : 'secondary'}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteApiKeyMutation.mutate(key.id)}
                            disabled={deleteApiKeyMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Webhook Endpoints</CardTitle>
                <p className="text-sm text-gray-600">
                  Configure webhooks to receive real-time notifications
                </p>
              </div>
              <Button onClick={() => setShowWebhookDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </CardHeader>
            <CardContent>
              {webhooksLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No webhooks configured. Add a webhook to receive real-time notifications.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Last Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {webhook.url}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="secondary" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {webhook.last_delivery ? formatDate(webhook.last_delivery) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                            {webhook.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                            disabled={deleteWebhookMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <p className="text-sm text-gray-600">
                View your recent account activity and login history
              </p>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent activity to display.
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{log.action}</p>
                        <p className="text-sm text-gray-600">{log.description}</p>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Globe className="h-3 w-3 mr-1" />
                            {log.ip_address}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <p className="text-sm text-gray-600">
                  Add an extra layer of security to your account
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {securityLoading ? (
                  <div className="flex justify-center py-4">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="2fa">Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-600">
                          {securitySettings?.two_factor_enabled
                            ? 'Currently enabled'
                            : 'Currently disabled'
                          }
                        </p>
                      </div>
                      <Switch
                        id="2fa"
                        checked={securitySettings?.two_factor_enabled || false}
                        onCheckedChange={(checked) => toggle2FAMutation.mutate(checked)}
                        disabled={toggle2FAMutation.isPending}
                      />
                    </div>
                    {securitySettings?.two_factor_enabled && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Two-factor authentication is active. Keep your backup codes safe.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Password Security</CardTitle>
                <p className="text-sm text-gray-600">
                  Manage your password and security settings
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {securitySettings && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Changed</span>
                      <span className="text-sm">
                        {formatDate(securitySettings.password_last_changed)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Session Timeout</span>
                      <span className="text-sm">{securitySettings.session_timeout} minutes</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowPasswordDialog(true)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <p className="text-sm text-gray-600">
                Configure how and when you receive notifications
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : notificationPrefs ? (
                <>
                  <div className="space-y-4">
                    <h4 className="font-medium">Email Notifications</h4>
                    <div className="space-y-3">
                      {Object.entries(notificationPrefs.email_notifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label htmlFor={`email-${key}`} className="capitalize">
                            {key.replace('_', ' ')}
                          </Label>
                          <Switch
                            id={`email-${key}`}
                            checked={value}
                            onCheckedChange={(checked) => {
                              const updatedPrefs = {
                                ...notificationPrefs,
                                email_notifications: {
                                  ...notificationPrefs.email_notifications,
                                  [key]: checked,
                                },
                              };
                              updateNotificationsMutation.mutate(updatedPrefs);
                            }}
                            disabled={updateNotificationsMutation.isPending}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Push Notifications</h4>
                    <div className="space-y-3">
                      {Object.entries(notificationPrefs.push_notifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label htmlFor={`push-${key}`} className="capitalize">
                            {key.replace('_', ' ')}
                          </Label>
                          <Switch
                            id={`push-${key}`}
                            checked={value}
                            onCheckedChange={(checked) => {
                              const updatedPrefs = {
                                ...notificationPrefs,
                                push_notifications: {
                                  ...notificationPrefs.push_notifications,
                                  [key]: checked,
                                },
                              };
                              updateNotificationsMutation.mutate(updatedPrefs);
                            }}
                            disabled={updateNotificationsMutation.isPending}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Frequency & Timing</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Notification Frequency</Label>
                        <Select
                          value={notificationPrefs.notification_frequency}
                          onValueChange={(value: 'immediate' | 'hourly' | 'daily') => {
                            const updatedPrefs = {
                              ...notificationPrefs,
                              notification_frequency: value,
                            };
                            updateNotificationsMutation.mutate(updatedPrefs);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="quiet-hours">Quiet Hours</Label>
                        <Switch
                          id="quiet-hours"
                          checked={notificationPrefs.quiet_hours.enabled}
                          onCheckedChange={(checked) => {
                            const updatedPrefs = {
                              ...notificationPrefs,
                              quiet_hours: {
                                ...notificationPrefs.quiet_hours,
                                enabled: checked,
                              },
                            };
                            updateNotificationsMutation.mutate(updatedPrefs);
                          }}
                          disabled={updateNotificationsMutation.isPending}
                        />
                      </div>

                      {notificationPrefs.quiet_hours.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={notificationPrefs.quiet_hours.start_time}
                              onChange={(e) => {
                                const updatedPrefs = {
                                  ...notificationPrefs,
                                  quiet_hours: {
                                    ...notificationPrefs.quiet_hours,
                                    start_time: e.target.value,
                                  },
                                };
                                updateNotificationsMutation.mutate(updatedPrefs);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={notificationPrefs.quiet_hours.end_time}
                              onChange={(e) => {
                                const updatedPrefs = {
                                  ...notificationPrefs,
                                  quiet_hours: {
                                    ...notificationPrefs.quiet_hours,
                                    end_time: e.target.value,
                                  },
                                };
                                updateNotificationsMutation.mutate(updatedPrefs);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load notification preferences.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new strong password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access to your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Name</Label>
              <Input
                id="api-key-name"
                value={apiKeyForm.name}
                onChange={(e) => setApiKeyForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My API Key"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                {['read:orders', 'write:orders', 'read:integrations', 'write:integrations', 'read:analytics'].map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={apiKeyForm.permissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setApiKeyForm(prev => ({
                            ...prev,
                            permissions: [...prev.permissions, permission]
                          }));
                        } else {
                          setApiKeyForm(prev => ({
                            ...prev,
                            permissions: prev.permissions.filter(p => p !== permission)
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={permission}>{permission}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
              <Input
                id="expires-at"
                type="date"
                value={apiKeyForm.expires_at}
                onChange={(e) => setApiKeyForm(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApiKeyDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createApiKeyMutation.isPending}
              >
                {createApiKeyMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create API Key'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Webhook Dialog */}
      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Configure a webhook to receive real-time notifications for events.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWebhookSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                value={webhookForm.name}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Webhook"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                type="url"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://your-domain.com/webhook"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'order.created',
                  'order.updated',
                  'order.cancelled',
                  'integration.connected',
                  'integration.disconnected',
                  'integration.error',
                  'webhook.delivery_failed',
                  'system.alert'
                ].map((event) => (
                  <div key={event} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={event}
                      checked={webhookForm.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWebhookForm(prev => ({
                            ...prev,
                            events: [...prev.events, event]
                          }));
                        } else {
                          setWebhookForm(prev => ({
                            ...prev,
                            events: prev.events.filter(ev => ev !== event)
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={event} className="text-sm">{event}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Secret (Optional)</Label>
              <Input
                id="webhook-secret"
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                placeholder="Webhook secret for signature validation"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWebhookDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createWebhookMutation.isPending}
              >
                {createWebhookMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Webhook'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  Settings,
  TestTube,
  Sync,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';

interface POSSystem {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  version: string;
  connectionType: string;
  status: 'active' | 'inactive' | 'error' | 'testing';
  lastSync: string;
  features: string[];
  integrations: number;
  responseTime: number;
  errorCount: number;
}

interface POSIntegration {
  id: string;
  name: string;
  posSystem: string;
  branch: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync: string;
  nextSync: string;
  syncInterval: number;
  recordsSynced: number;
  errorCount: number;
}

export const POSSystemsManagement: React.FC = () => {
  const [posSystems, setPOSSystems] = useState<POSSystem[]>([]);
  const [posIntegrations, setPOSIntegrations] = useState<POSIntegration[]>([]);
  const [filteredSystems, setFilteredSystems] = useState<POSSystem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<POSSystem | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPOSSystems();
    loadPOSIntegrations();
  }, []);

  useEffect(() => {
    filterSystems();
  }, [searchTerm, statusFilter, providerFilter, posSystems]);

  const loadPOSSystems = async () => {
    try {
      const response = await fetch('/api/integration-management/pos-systems');
      const data = await response.json();
      setPOSSystems(data.data || []);
    } catch (error) {
      console.error('Failed to load POS systems:', error);
    }
  };

  const loadPOSIntegrations = async () => {
    try {
      const response = await fetch('/api/integration-management/pos-integrations');
      const data = await response.json();
      setPOSIntegrations(data.data || []);
    } catch (error) {
      console.error('Failed to load POS integrations:', error);
    }
  };

  const filterSystems = () => {
    let filtered = posSystems;

    if (searchTerm) {
      filtered = filtered.filter(
        (system) =>
          system.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          system.provider.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((system) => system.status === statusFilter);
    }

    if (providerFilter !== 'all') {
      filtered = filtered.filter((system) => system.provider === providerFilter);
    }

    setFilteredSystems(filtered);
  };

  const testConnection = async (system: POSSystem) => {
    setSelectedSystem(system);
    setIsTestDialogOpen(true);
    setLoading(true);

    try {
      const response = await fetch(`/api/integration-management/pos-systems/${system.id}/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'full',
          includeDataSync: true,
        }),
      });

      const results = await response.json();
      setTestResults(results);
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResults({
        success: false,
        error: 'Connection test failed',
        details: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const forceSync = async (systemId: string) => {
    try {
      await fetch(`/api/integration-management/pos-systems/${systemId}/force-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncType: 'full',
        }),
      });

      // Reload data to show updated sync status
      loadPOSSystems();
      loadPOSIntegrations();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'inactive': return <Clock className="h-4 w-4 text-gray-400" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'testing': return <TestTube className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const uniqueProviders = [...new Set(posSystems.map(system => system.provider))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">POS Systems Management</h2>
          <p className="text-gray-600 mt-1">
            Configure and manage Point of Sale system integrations
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add POS System
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New POS System</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Add POS System form would go here */}
              <div className="text-center py-8 text-gray-500">
                POS System configuration form would be implemented here
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search POS systems..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {uniqueProviders.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* POS Systems Table */}
      <Card>
        <CardHeader>
          <CardTitle>Available POS Systems</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Integrations</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSystems.map((system) => (
                <TableRow key={system.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{system.displayName}</div>
                      <div className="text-sm text-gray-500">v{system.version}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{system.provider}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{system.connectionType}</div>
                      <div className="text-gray-500">
                        Last sync: {system.lastSync}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(system.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(system.status)}
                        <span className="capitalize">{system.status}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium">{system.integrations}</div>
                      <div className="text-sm text-gray-500">branches</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{system.responseTime}ms</div>
                      {system.errorCount > 0 && (
                        <div className="text-red-600">
                          {system.errorCount} errors
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(system)}
                      >
                        <TestTube className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => forceSync(system.id)}
                      >
                        <Sync className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Active Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Integration Name</TableHead>
                <TableHead>POS System</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posIntegrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell>
                    <div className="font-medium">{integration.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{integration.posSystem}</Badge>
                  </TableCell>
                  <TableCell>{integration.branch}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(integration.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(integration.status)}
                        <span className="capitalize">{integration.status}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Last: {integration.lastSync}</div>
                      <div>Next: {integration.nextSync}</div>
                      <div className="text-gray-500">
                        Every {integration.syncInterval / 60}min
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{integration.recordsSynced} records</div>
                      {integration.errorCount > 0 && (
                        <div className="text-red-600">
                          {integration.errorCount} errors
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Connection Test Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connection Test Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Testing connection...</p>
              </div>
            ) : testResults ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center space-x-2">
                    {testResults.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-medium ${testResults.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResults.success ? 'Connection Successful' : 'Connection Failed'}
                    </span>
                  </div>
                  {testResults.message && (
                    <p className="mt-2 text-sm text-gray-700">{testResults.message}</p>
                  )}
                </div>

                {testResults.details && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Test Details:</h4>
                    <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                      {JSON.stringify(testResults.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
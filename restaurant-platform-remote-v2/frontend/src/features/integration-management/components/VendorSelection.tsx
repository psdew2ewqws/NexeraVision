import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  Zap,
  Calculator,
  Target,
  Award,
  AlertCircle,
  CheckCircle2,
  Truck,
} from 'lucide-react';

interface VendorScore {
  providerId: string;
  providerType: string;
  providerName: string;
  totalScore: number;
  scores: {
    proximity: number;
    capacity: number;
    cost: number;
    performance: number;
    priority: number;
  };
  quote: {
    baseFee: number;
    distanceFee: number;
    totalFee: number;
    estimatedTime: number;
    distance: number;
  };
  isRecommended: boolean;
}

interface VendorSelectionResult {
  selectedProvider: VendorScore;
  alternativeProviders: VendorScore[];
  selectionMetadata: {
    totalProvidersEvaluated: number;
    eliminatedProviders: number;
    selectionTimeMs: number;
  };
}

interface ProviderAvailability {
  providerType: string;
  isAvailable: boolean;
  currentOrders: number;
  maxOrders: number;
  estimatedDelivery: number;
  utilizationRate: number;
}

export const VendorSelection: React.FC = () => {
  const [selectionResult, setSelectionResult] = useState<VendorSelectionResult | null>(null);
  const [providerAvailability, setProviderAvailability] = useState<ProviderAvailability[]>([]);
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    branchId: '',
    customerLat: '',
    customerLng: '',
    orderValue: '',
    isUrgent: false,
    maxDeliveryTime: '',
    maxDeliveryFee: '',
  });

  useEffect(() => {
    loadProviderAvailability();
  }, []);

  const loadProviderAvailability = async () => {
    try {
      const response = await fetch('/api/integration-management/vendor-selection/availability');
      const data = await response.json();
      setProviderAvailability(data.data || []);
    } catch (error) {
      console.error('Failed to load provider availability:', error);
    }
  };

  const selectOptimalVendor = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/integration-management/vendor-selection/select-optimal-vendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branchId: formData.branchId,
          customerLocation: {
            lat: parseFloat(formData.customerLat),
            lng: parseFloat(formData.customerLng),
          },
          orderValue: parseFloat(formData.orderValue),
          isUrgent: formData.isUrgent,
          maxDeliveryTime: formData.maxDeliveryTime ? parseInt(formData.maxDeliveryTime) : undefined,
          maxDeliveryFee: formData.maxDeliveryFee ? parseFloat(formData.maxDeliveryFee) : undefined,
        }),
      });

      const result = await response.json();
      setSelectionResult(result);
    } catch (error) {
      console.error('Vendor selection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (category: string) => {
    switch (category) {
      case 'proximity': return <MapPin className="h-4 w-4" />;
      case 'capacity': return <Truck className="h-4 w-4" />;
      case 'cost': return <DollarSign className="h-4 w-4" />;
      case 'performance': return <TrendingUp className="h-4 w-4" />;
      case 'priority': return <Award className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-JO', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getAvailabilityColor = (utilizationRate: number) => {
    if (utilizationRate < 60) return 'text-green-600 bg-green-50';
    if (utilizationRate < 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Intelligent Vendor Selection</h2>
          <p className="text-gray-600 mt-1">
            AI-powered delivery provider selection based on multiple criteria
          </p>
        </div>
        <Dialog open={isSelectionDialogOpen} onOpenChange={setIsSelectionDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calculator className="h-4 w-4 mr-2" />
              Select Optimal Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vendor Selection Criteria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branchId">Branch</Label>
                  <Select value={formData.branchId} onValueChange={(value) => setFormData({ ...formData, branchId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="branch1">Main Branch</SelectItem>
                      <SelectItem value="branch2">Downtown Branch</SelectItem>
                      <SelectItem value="branch3">Mall Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderValue">Order Value (JOD)</Label>
                  <Input
                    id="orderValue"
                    type="number"
                    step="0.01"
                    placeholder="25.50"
                    value={formData.orderValue}
                    onChange={(e) => setFormData({ ...formData, orderValue: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerLat">Customer Latitude</Label>
                  <Input
                    id="customerLat"
                    type="number"
                    step="any"
                    placeholder="31.9539"
                    value={formData.customerLat}
                    onChange={(e) => setFormData({ ...formData, customerLat: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerLng">Customer Longitude</Label>
                  <Input
                    id="customerLng"
                    type="number"
                    step="any"
                    placeholder="35.9106"
                    value={formData.customerLng}
                    onChange={(e) => setFormData({ ...formData, customerLng: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxDeliveryTime">Max Delivery Time (minutes)</Label>
                  <Input
                    id="maxDeliveryTime"
                    type="number"
                    placeholder="60"
                    value={formData.maxDeliveryTime}
                    onChange={(e) => setFormData({ ...formData, maxDeliveryTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxDeliveryFee">Max Delivery Fee (JOD)</Label>
                  <Input
                    id="maxDeliveryFee"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={formData.maxDeliveryFee}
                    onChange={(e) => setFormData({ ...formData, maxDeliveryFee: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isUrgent"
                  checked={formData.isUrgent}
                  onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                />
                <Label htmlFor="isUrgent">Urgent delivery required</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsSelectionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={selectOptimalVendor} disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Selecting...
                    </div>
                  ) : (
                    'Select Vendor'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Provider Availability Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="h-5 w-5 mr-2" />
            Real-time Provider Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providerAvailability.map((provider, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4" />
                    <span className="font-medium capitalize">{provider.providerType}</span>
                  </div>
                  <Badge
                    variant={provider.isAvailable ? 'default' : 'secondary'}
                    className={provider.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                  >
                    {provider.isAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current Orders:</span>
                    <span>{provider.currentOrders} / {provider.maxOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Delivery:</span>
                    <span>{provider.estimatedDelivery} min</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Utilization</span>
                      <span>{provider.utilizationRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={provider.utilizationRate} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selection Results */}
      {selectionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Vendor Selection Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Selected Provider */}
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="text-lg font-bold text-green-800">
                        Selected: {selectionResult.selectedProvider.providerName}
                      </h3>
                      <p className="text-green-700">
                        Total Score: {selectionResult.selectedProvider.totalScore}/100
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white">
                    <Award className="h-3 w-3 mr-1" />
                    Recommended
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-800 mb-3">Performance Scores</h4>
                    <div className="space-y-2">
                      {Object.entries(selectionResult.selectedProvider.scores).map(([category, score]) => (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getScoreIcon(category)}
                            <span className="capitalize">{category}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${getScoreColor(score)}`}>
                              {score.toFixed(1)}
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${score}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-green-800 mb-3">Delivery Quote</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Base Fee:</span>
                        <span>{formatCurrency(selectionResult.selectedProvider.quote.baseFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distance Fee:</span>
                        <span>{formatCurrency(selectionResult.selectedProvider.quote.distanceFee)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total Fee:</span>
                        <span className="text-green-700">
                          {formatCurrency(selectionResult.selectedProvider.quote.totalFee)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated Time:</span>
                        <span>{selectionResult.selectedProvider.quote.estimatedTime} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distance:</span>
                        <span>{selectionResult.selectedProvider.quote.distance.toFixed(1)} km</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternative Providers */}
              {selectionResult.alternativeProviders.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Alternative Options</h3>
                  <div className="space-y-3">
                    {selectionResult.alternativeProviders.map((provider, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Truck className="h-5 w-5 text-gray-600" />
                            <div>
                              <span className="font-medium">{provider.providerName}</span>
                              <div className="text-sm text-gray-500">
                                Score: {provider.totalScore}/100
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(provider.quote.totalFee)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {provider.quote.estimatedTime} min
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Select
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selection Metadata */}
              <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
                <span>
                  Evaluated {selectionResult.selectionMetadata.totalProvidersEvaluated} providers
                  ({selectionResult.selectionMetadata.eliminatedProviders} eliminated)
                </span>
                <span>
                  Selection completed in {selectionResult.selectionMetadata.selectionTimeMs}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
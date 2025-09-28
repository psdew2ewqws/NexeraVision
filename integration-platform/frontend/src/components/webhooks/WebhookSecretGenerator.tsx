import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import {
  Key,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface WebhookSecretGeneratorProps {
  form: UseFormReturn<any>;
}

const WebhookSecretGenerator: React.FC<WebhookSecretGeneratorProps> = ({ form }) => {
  const [showSecret, setShowSecret] = useState(false);
  const [secretStrength, setSecretStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSecureSecret = (length: number = 64): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    const randomArray = new Uint8Array(length);
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < length; i++) {
      result += charset[randomArray[i] % charset.length];
    }

    return result;
  };

  const generateSecret = async (type: 'simple' | 'secure' | 'enterprise') => {
    setIsGenerating(true);

    // Simulate generation delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    let secret: string;
    let strength: 'weak' | 'medium' | 'strong';

    switch (type) {
      case 'simple':
        secret = generateSecureSecret(32);
        strength = 'medium';
        break;
      case 'secure':
        secret = generateSecureSecret(64);
        strength = 'strong';
        break;
      case 'enterprise':
        // Generate a more complex secret with timestamp and randomness
        const timestamp = Date.now().toString(36);
        const randomPart = generateSecureSecret(48);
        secret = `${timestamp}_${randomPart}`;
        strength = 'strong';
        break;
      default:
        secret = generateSecureSecret(32);
        strength = 'medium';
    }

    form.setValue('secretKey', secret);
    setSecretStrength(strength);
    setIsGenerating(false);
    toast.success('New webhook secret generated successfully');
  };

  const copyToClipboard = async () => {
    const secret = form.watch('secretKey');
    if (!secret) {
      toast.error('No secret to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(secret);
      toast.success('Secret copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy secret');
    }
  };

  const analyzeSecretStrength = (secret: string): 'weak' | 'medium' | 'strong' => {
    if (!secret) return 'weak';

    const length = secret.length;
    const hasUpperCase = /[A-Z]/.test(secret);
    const hasLowerCase = /[a-z]/.test(secret);
    const hasNumbers = /[0-9]/.test(secret);
    const hasSpecialChars = /[^A-Za-z0-9]/.test(secret);

    let score = 0;
    if (length >= 32) score += 2;
    else if (length >= 16) score += 1;

    if (hasUpperCase) score += 1;
    if (hasLowerCase) score += 1;
    if (hasNumbers) score += 1;
    if (hasSpecialChars) score += 1;

    if (score >= 6) return 'strong';
    if (score >= 4) return 'medium';
    return 'weak';
  };

  // Watch for secret changes to update strength
  React.useEffect(() => {
    const secret = form.watch('secretKey');
    setSecretStrength(analyzeSecretStrength(secret));
  }, [form.watch('secretKey')]);

  const getStrengthColor = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'strong': return 'text-green-600 bg-green-100';
    }
  };

  const getStrengthIcon = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Shield className="w-4 h-4" />;
      case 'strong': return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Webhook Secret Key
        </CardTitle>
        <CardDescription>
          Generate and manage your webhook secret key for HMAC signature validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Secret Display */}
        <div>
          <Label htmlFor="secretKey">Secret Key</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Input
                {...form.register('secretKey')}
                type={showSecret ? 'text' : 'password'}
                placeholder="Enter or generate a webhook secret key"
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSecret(!showSecret)}
                  className="h-6 w-6 p-0"
                >
                  {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-6 w-6 p-0"
                  disabled={!form.watch('secretKey')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Secret Strength Indicator */}
          {form.watch('secretKey') && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Strength:</span>
              <Badge className={getStrengthColor(secretStrength)}>
                {getStrengthIcon(secretStrength)}
                <span className="ml-1 capitalize">{secretStrength}</span>
              </Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Secret Generation Options */}
        <div className="space-y-3">
          <h4 className="font-medium">Generate New Secret</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => generateSecret('simple')}
              disabled={isGenerating}
              className="flex flex-col items-center gap-2 h-auto py-3"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              <div className="text-center">
                <div className="font-medium">Simple</div>
                <div className="text-xs text-muted-foreground">32 characters</div>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => generateSecret('secure')}
              disabled={isGenerating}
              className="flex flex-col items-center gap-2 h-auto py-3"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              <div className="text-center">
                <div className="font-medium">Secure</div>
                <div className="text-xs text-muted-foreground">64 characters</div>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => generateSecret('enterprise')}
              disabled={isGenerating}
              className="flex flex-col items-center gap-2 h-auto py-3"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <div className="text-center">
                <div className="font-medium">Enterprise</div>
                <div className="text-xs text-muted-foreground">Timestamped</div>
              </div>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Security Information */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Info className="w-4 h-4" />
            Security Guidelines
          </h4>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Use a unique secret for each webhook endpoint</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Store secrets securely and never expose them in logs</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Rotate secrets regularly (recommended: every 90 days)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Use HMAC-SHA256 for signature validation</span>
            </div>
          </div>
        </div>

        {/* HMAC Implementation Guide */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">HMAC Signature Validation</h5>
          <div className="text-sm text-blue-800 space-y-1">
            <p>Your webhook endpoint should validate incoming requests using the secret:</p>
            <code className="block mt-2 p-2 bg-blue-100 rounded text-xs">
              {`const signature = req.headers['x-webhook-signature'];\nconst payload = JSON.stringify(req.body);\nconst expectedSignature = crypto\n  .createHmac('sha256', webhookSecret)\n  .update(payload)\n  .digest('hex');\nconst isValid = signature === expectedSignature;`}
            </code>
          </div>
        </div>

        {/* Warning for existing secret */}
        {form.watch('secretKey') && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Changing the secret key will affect existing integrations</p>
                <p>Make sure to update all systems that validate webhook signatures before saving changes.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebhookSecretGenerator;
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Send,
  Eye,
  Save,
  Copy,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  Zap
} from 'lucide-react';

// Types
interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'marketing' | 'utility' | 'authentication' | 'order_notification' | 'promotion';
  language: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  components: WhatsAppComponent[];
  createdAt: string;
  updatedAt: string;
  approvalStatus?: {
    submittedAt: string;
    reviewedAt?: string;
    reason?: string;
  };
}

interface WhatsAppComponent {
  type: 'header' | 'body' | 'footer' | 'buttons';
  format?: 'text' | 'media' | 'location';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: WhatsAppButton[];
}

interface WhatsAppButton {
  type: 'quick_reply' | 'url' | 'phone_number';
  text: string;
  url?: string;
  phone_number?: string;
}

interface Variable {
  name: string;
  example: string;
  description: string;
}

interface WhatsAppTemplateBuilderProps {
  companyId: string;
  onTemplateCreated?: (template: WhatsAppTemplate) => void;
  initialTemplate?: Partial<WhatsAppTemplate>;
}

// Predefined template categories
const TEMPLATE_CATEGORIES = [
  { value: 'order_notification', label: 'Order Notifications', description: 'Order status updates and confirmations' },
  { value: 'marketing', label: 'Marketing', description: 'Promotional messages and campaigns' },
  { value: 'utility', label: 'Utility', description: 'Account updates and service notifications' },
  { value: 'authentication', label: 'Authentication', description: 'OTP and verification messages' },
  { value: 'promotion', label: 'Promotions', description: 'Special offers and discounts' }
];

// Common variables for different categories
const COMMON_VARIABLES: Record<string, Variable[]> = {
  order_notification: [
    { name: '{{customer_name}}', example: 'John Doe', description: 'Customer full name' },
    { name: '{{order_number}}', example: 'ORD-12345', description: 'Order reference number' },
    { name: '{{order_total}}', example: '$25.50', description: 'Order total amount' },
    { name: '{{delivery_time}}', example: '30-45 minutes', description: 'Estimated delivery time' },
    { name: '{{restaurant_name}}', example: 'Pizza Palace', description: 'Restaurant name' },
    { name: '{{tracking_link}}', example: 'https://track.example.com/12345', description: 'Order tracking URL' }
  ],
  marketing: [
    { name: '{{customer_name}}', example: 'John Doe', description: 'Customer full name' },
    { name: '{{offer_title}}', example: '20% Off Today', description: 'Promotion title' },
    { name: '{{offer_code}}', example: 'SAVE20', description: 'Discount code' },
    { name: '{{expiry_date}}', example: 'Dec 31, 2024', description: 'Offer expiry date' },
    { name: '{{restaurant_name}}', example: 'Pizza Palace', description: 'Restaurant name' }
  ],
  promotion: [
    { name: '{{customer_name}}', example: 'John Doe', description: 'Customer full name' },
    { name: '{{discount_amount}}', example: '25%', description: 'Discount percentage or amount' },
    { name: '{{promo_code}}', example: 'WEEKEND25', description: 'Promotional code' },
    { name: '{{valid_until}}', example: 'Sunday midnight', description: 'Promotion validity' },
    { name: '{{min_order}}', example: '$20', description: 'Minimum order requirement' }
  ],
  utility: [
    { name: '{{customer_name}}', example: 'John Doe', description: 'Customer full name' },
    { name: '{{account_status}}', example: 'Active', description: 'Account status' },
    { name: '{{update_date}}', example: 'Dec 15, 2024', description: 'Update date' },
    { name: '{{support_link}}', example: 'https://support.example.com', description: 'Support URL' }
  ],
  authentication: [
    { name: '{{otp_code}}', example: '123456', description: 'One-time password' },
    { name: '{{expiry_minutes}}', example: '5', description: 'OTP expiry time in minutes' },
    { name: '{{app_name}}', example: 'Restaurant App', description: 'Application name' }
  ]
};

// Sample templates for different categories
const SAMPLE_TEMPLATES: Record<string, Partial<WhatsAppTemplate>> = {
  order_notification: {
    name: 'Order Confirmation',
    category: 'order_notification',
    components: [
      {
        type: 'header',
        format: 'text',
        text: 'Order Confirmed! 🍕'
      },
      {
        type: 'body',
        text: 'Hi {{customer_name}}, your order #{{order_number}} has been confirmed!\n\nTotal: {{order_total}}\nEstimated delivery: {{delivery_time}}\n\nThank you for choosing {{restaurant_name}}!',
        example: {
          body_text: [['John Doe', 'ORD-12345', '$25.50', '30-45 minutes', 'Pizza Palace']]
        }
      },
      {
        type: 'footer',
        text: 'Track your order anytime'
      },
      {
        type: 'buttons',
        buttons: [
          { type: 'url', text: 'Track Order', url: '{{tracking_link}}' },
          { type: 'quick_reply', text: 'Contact Support' }
        ]
      }
    ]
  },
  marketing: {
    name: 'Weekend Special Offer',
    category: 'marketing',
    components: [
      {
        type: 'header',
        format: 'text',
        text: '🎉 {{offer_title}}'
      },
      {
        type: 'body',
        text: 'Hey {{customer_name}}! Don\'t miss out on our amazing weekend deal.\n\nUse code {{offer_code}} and save big on your next order!\n\nValid until {{expiry_date}} - Order now from {{restaurant_name}}!',
        example: {
          body_text: [['John Doe', 'SAVE20', 'Dec 31, 2024', 'Pizza Palace']]
        }
      },
      {
        type: 'buttons',
        buttons: [
          { type: 'url', text: 'Order Now', url: 'https://example.com/order' },
          { type: 'quick_reply', text: 'View Menu' }
        ]
      }
    ]
  }
};

// Component editors
const HeaderEditor: React.FC<{
  component: WhatsAppComponent;
  onChange: (component: WhatsAppComponent) => void;
}> = ({ component, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>Header Format</Label>
        <Select
          value={component.format || 'text'}
          onValueChange={(value) => onChange({ ...component, format: value as 'text' | 'media' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="media">Media (Image/Video)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {component.format === 'text' && (
        <div>
          <Label>Header Text</Label>
          <Input
            value={component.text || ''}
            onChange={(e) => onChange({ ...component, text: e.target.value })}
            placeholder="Enter header text"
            maxLength={60}
          />
          <p className="text-xs text-gray-500 mt-1">
            {(component.text || '').length}/60 characters
          </p>
        </div>
      )}

      {component.format === 'media' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Media headers require uploading images or videos through the WhatsApp Business API.
            This will be handled during template submission.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

const BodyEditor: React.FC<{
  component: WhatsAppComponent;
  onChange: (component: WhatsAppComponent) => void;
  variables: Variable[];
}> = ({ component, onChange, variables }) => {
  const [selectedVariable, setSelectedVariable] = useState('');

  const insertVariable = () => {
    if (!selectedVariable) return;

    const textarea = document.getElementById('body-text') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = component.text || '';
    const newText = currentText.substring(0, start) + selectedVariable + currentText.substring(end);

    onChange({ ...component, text: newText });
    setSelectedVariable('');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Body Text *</Label>
        <Textarea
          id="body-text"
          value={component.text || ''}
          onChange={(e) => onChange({ ...component, text: e.target.value })}
          placeholder="Enter your message body with variables like {{customer_name}}"
          rows={6}
          maxLength={1024}
        />
        <p className="text-xs text-gray-500 mt-1">
          {(component.text || '').length}/1024 characters
        </p>
      </div>

      <div className="flex space-x-2">
        <Select value={selectedVariable} onValueChange={setSelectedVariable}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a variable to insert" />
          </SelectTrigger>
          <SelectContent>
            {variables.map(variable => (
              <SelectItem key={variable.name} value={variable.name}>
                {variable.name} - {variable.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={insertVariable} disabled={!selectedVariable} variant="outline">
          Insert Variable
        </Button>
      </div>

      <div>
        <Label>Available Variables</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {variables.map(variable => (
            <Badge
              key={variable.name}
              variant="secondary"
              className="cursor-pointer hover:bg-blue-100"
              onClick={() => {
                const textarea = document.getElementById('body-text') as HTMLTextAreaElement;
                const currentText = component.text || '';
                onChange({ ...component, text: currentText + variable.name });
              }}
            >
              {variable.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

const FooterEditor: React.FC<{
  component: WhatsAppComponent;
  onChange: (component: WhatsAppComponent) => void;
}> = ({ component, onChange }) => {
  return (
    <div>
      <Label>Footer Text</Label>
      <Input
        value={component.text || ''}
        onChange={(e) => onChange({ ...component, text: e.target.value })}
        placeholder="Optional footer text"
        maxLength={60}
      />
      <p className="text-xs text-gray-500 mt-1">
        {(component.text || '').length}/60 characters
      </p>
    </div>
  );
};

const ButtonsEditor: React.FC<{
  component: WhatsAppComponent;
  onChange: (component: WhatsAppComponent) => void;
}> = ({ component, onChange }) => {
  const addButton = () => {
    const newButton: WhatsAppButton = {
      type: 'quick_reply',
      text: ''
    };

    onChange({
      ...component,
      buttons: [...(component.buttons || []), newButton]
    });
  };

  const updateButton = (index: number, button: WhatsAppButton) => {
    const buttons = [...(component.buttons || [])];
    buttons[index] = button;
    onChange({ ...component, buttons });
  };

  const removeButton = (index: number) => {
    const buttons = [...(component.buttons || [])];
    buttons.splice(index, 1);
    onChange({ ...component, buttons });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Action Buttons</Label>
        <Button
          onClick={addButton}
          disabled={(component.buttons || []).length >= 3}
          size="sm"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Button
        </Button>
      </div>

      {(component.buttons || []).map((button, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Button {index + 1}</Label>
                <Button
                  onClick={() => removeButton(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label>Button Type</Label>
                <Select
                  value={button.type}
                  onValueChange={(value) => updateButton(index, { ...button, type: value as WhatsAppButton['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick_reply">Quick Reply</SelectItem>
                    <SelectItem value="url">URL Button</SelectItem>
                    <SelectItem value="phone_number">Phone Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Button Text</Label>
                <Input
                  value={button.text}
                  onChange={(e) => updateButton(index, { ...button, text: e.target.value })}
                  placeholder="Button text"
                  maxLength={20}
                />
              </div>

              {button.type === 'url' && (
                <div>
                  <Label>URL</Label>
                  <Input
                    value={button.url || ''}
                    onChange={(e) => updateButton(index, { ...button, url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              )}

              {button.type === 'phone_number' && (
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={button.phone_number || ''}
                    onChange={(e) => updateButton(index, { ...button, phone_number: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {(component.buttons || []).length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No buttons added. Click "Add Button" to include action buttons.
        </p>
      )}
    </div>
  );
};

// Preview component
const TemplatePreview: React.FC<{
  template: Partial<WhatsAppTemplate>;
  variables: Variable[];
}> = ({ template, variables }) => {
  const replaceVariables = (text: string) => {
    let result = text;
    variables.forEach(variable => {
      result = result.replace(new RegExp(variable.name.replace(/[{}]/g, '\\$&'), 'g'), variable.example);
    });
    return result;
  };

  const headerComponent = template.components?.find(c => c.type === 'header');
  const bodyComponent = template.components?.find(c => c.type === 'body');
  const footerComponent = template.components?.find(c => c.type === 'footer');
  const buttonsComponent = template.components?.find(c => c.type === 'buttons');

  return (
    <div className="max-w-sm mx-auto bg-green-50 rounded-lg p-4 border">
      <div className="bg-white rounded-lg p-3 shadow-sm">
        {/* Header */}
        {headerComponent?.text && (
          <div className="font-semibold text-gray-800 mb-2">
            {headerComponent.format === 'text' ? replaceVariables(headerComponent.text) : '[Media Header]'}
          </div>
        )}

        {/* Body */}
        {bodyComponent?.text && (
          <div className="text-gray-700 mb-3 whitespace-pre-wrap">
            {replaceVariables(bodyComponent.text)}
          </div>
        )}

        {/* Footer */}
        {footerComponent?.text && (
          <div className="text-xs text-gray-500 mb-3">
            {replaceVariables(footerComponent.text)}
          </div>
        )}

        {/* Buttons */}
        {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
          <div className="space-y-2">
            {buttonsComponent.buttons.map((button, index) => (
              <div
                key={index}
                className={`p-2 text-center text-sm font-medium rounded border cursor-pointer ${
                  button.type === 'url' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  button.type === 'phone_number' ? 'bg-green-50 border-green-200 text-green-700' :
                  'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                {button.text}
                {button.type === 'url' && ' 🔗'}
                {button.type === 'phone_number' && ' 📞'}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center mt-2">
        <MessageSquare className="w-4 h-4 mx-auto text-green-600" />
        <p className="text-xs text-gray-500 mt-1">WhatsApp Preview</p>
      </div>
    </div>
  );
};

// Main component
const WhatsAppTemplateBuilder: React.FC<WhatsAppTemplateBuilderProps> = ({
  companyId,
  onTemplateCreated,
  initialTemplate
}) => {
  const [template, setTemplate] = useState<Partial<WhatsAppTemplate>>({
    name: '',
    category: 'order_notification',
    language: 'en',
    status: 'draft',
    components: [
      { type: 'body', text: '' }
    ],
    ...initialTemplate
  });

  const [activeTab, setActiveTab] = useState('design');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const variables = COMMON_VARIABLES[template.category || 'order_notification'] || [];

  const updateComponent = (index: number, component: WhatsAppComponent) => {
    const components = [...(template.components || [])];
    components[index] = component;
    setTemplate(prev => ({ ...prev, components }));
  };

  const addComponent = (type: WhatsAppComponent['type']) => {
    const newComponent: WhatsAppComponent = { type };
    if (type === 'buttons') {
      newComponent.buttons = [];
    }

    setTemplate(prev => ({
      ...prev,
      components: [...(prev.components || []), newComponent]
    }));
  };

  const removeComponent = (index: number) => {
    const components = [...(template.components || [])];
    components.splice(index, 1);
    setTemplate(prev => ({ ...prev, components }));
  };

  const loadSampleTemplate = (category: string) => {
    const sample = SAMPLE_TEMPLATES[category];
    if (sample) {
      setTemplate(prev => ({
        ...prev,
        ...sample
      }));
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          companyId,
          status: 'draft'
        })
      });

      if (response.ok) {
        const savedTemplate = await response.json();
        setTemplate(savedTemplate);
        onTemplateCreated?.(savedTemplate);
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/whatsapp/templates/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          companyId,
          status: 'pending'
        })
      });

      if (response.ok) {
        const submittedTemplate = await response.json();
        setTemplate(submittedTemplate);
      }
    } catch (error) {
      console.error('Error submitting template:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const validateTemplate = () => {
    const errors = [];

    if (!template.name?.trim()) errors.push('Template name is required');
    if (!template.category) errors.push('Category is required');

    const bodyComponent = template.components?.find(c => c.type === 'body');
    if (!bodyComponent?.text?.trim()) errors.push('Body text is required');

    return errors;
  };

  const errors = validateTemplate();
  const canSave = errors.length === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Template Builder</h1>
          <p className="text-gray-600">Create and manage WhatsApp business message templates</p>
        </div>

        <div className="flex space-x-2">
          <Button onClick={saveTemplate} disabled={!canSave || saving} variant="outline">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            onClick={submitForApproval}
            disabled={!canSave || submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {template.status && template.status !== 'draft' && (
        <Alert className={
          template.status === 'approved' ? 'border-green-200 bg-green-50' :
          template.status === 'pending' ? 'border-yellow-200 bg-yellow-50' :
          'border-red-200 bg-red-50'
        }>
          {template.status === 'approved' ? (
            <CheckCircle className="h-4 w-4" />
          ) : template.status === 'pending' ? (
            <Clock className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Template status: <Badge className={
                  template.status === 'approved' ? 'bg-green-500' :
                  template.status === 'pending' ? 'bg-yellow-500' :
                  'bg-red-500'
                }>
                  {template.status.toUpperCase()}
                </Badge>
              </span>
              {template.approvalStatus?.reason && (
                <span className="text-sm">{template.approvalStatus.reason}</span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Builder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Template Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="samples">Samples</TabsTrigger>
                </TabsList>

                <TabsContent value="design" className="space-y-6 mt-6">
                  {/* Template Components */}
                  <div className="space-y-4">
                    {(template.components || []).map((component, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm capitalize">
                              {component.type} Component
                            </CardTitle>
                            <Button
                              onClick={() => removeComponent(index)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {component.type === 'header' && (
                            <HeaderEditor
                              component={component}
                              onChange={(c) => updateComponent(index, c)}
                            />
                          )}
                          {component.type === 'body' && (
                            <BodyEditor
                              component={component}
                              onChange={(c) => updateComponent(index, c)}
                              variables={variables}
                            />
                          )}
                          {component.type === 'footer' && (
                            <FooterEditor
                              component={component}
                              onChange={(c) => updateComponent(index, c)}
                            />
                          )}
                          {component.type === 'buttons' && (
                            <ButtonsEditor
                              component={component}
                              onChange={(c) => updateComponent(index, c)}
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {/* Add Component Buttons */}
                    <div className="flex space-x-2">
                      {!template.components?.find(c => c.type === 'header') && (
                        <Button
                          onClick={() => addComponent('header')}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Header
                        </Button>
                      )}

                      {!template.components?.find(c => c.type === 'footer') && (
                        <Button
                          onClick={() => addComponent('footer')}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Footer
                        </Button>
                      )}

                      {!template.components?.find(c => c.type === 'buttons') && (
                        <Button
                          onClick={() => addComponent('buttons')}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Buttons
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-6">
                  <div>
                    <Label>Template Name *</Label>
                    <Input
                      value={template.name || ''}
                      onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter template name"
                    />
                  </div>

                  <div>
                    <Label>Category *</Label>
                    <Select
                      value={template.category || 'order_notification'}
                      onValueChange={(value) => setTemplate(prev => ({ ...prev, category: value as WhatsAppTemplate['category'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            <div>
                              <div className="font-medium">{category.label}</div>
                              <div className="text-xs text-gray-500">{category.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Language</Label>
                    <Select
                      value={template.language || 'en'}
                      onValueChange={(value) => setTemplate(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="en_US">English (US)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="samples" className="space-y-4 mt-6">
                  <p className="text-sm text-gray-600">
                    Load pre-built templates to get started quickly
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(SAMPLE_TEMPLATES).map(([key, sample]) => (
                      <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{sample.name}</h4>
                              <p className="text-sm text-gray-600 capitalize">
                                {sample.category?.replace('_', ' ')}
                              </p>
                            </div>
                            <Button
                              onClick={() => loadSampleTemplate(key)}
                              size="sm"
                              variant="outline"
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              Load
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TemplatePreview template={template} variables={variables} />
            </CardContent>
          </Card>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Please fix the following issues:</div>
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm">• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Variable Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {variables.map(variable => (
                  <div key={variable.name} className="text-xs">
                    <Badge variant="secondary" className="text-xs">
                      {variable.name}
                    </Badge>
                    <p className="text-gray-600 mt-1">{variable.description}</p>
                    <p className="text-gray-500">Example: {variable.example}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTemplateBuilder;
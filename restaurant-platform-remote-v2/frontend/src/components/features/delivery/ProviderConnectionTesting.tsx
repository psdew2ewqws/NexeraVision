import React, { useState } from 'react';
import { 
  PlayIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { validateProviderConfig, testProviderConnection, INTEGRATION_CHECKLIST } from '../../../utils/deliveryValidation';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
  responseTime?: number;
  timestamp: Date;
}

interface ProviderConnectionTestingProps {
  providerType: string;
  credentials: Record<string, any>;
  configuration: Record<string, any>;
  onTestComplete?: (result: ConnectionTestResult) => void;
}

export default function ProviderConnectionTesting({
  providerType,
  credentials,
  configuration,
  onTestComplete
}: ProviderConnectionTestingProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<ConnectionTestResult[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Validate configuration before testing
  React.useEffect(() => {
    const validation = validateProviderConfig(providerType, credentials, configuration);
    setValidationResult(validation);
  }, [providerType, credentials, configuration]);

  // Helper computed values
  const isTestingOrInvalid = isTesting || !validationResult?.isValid;

  const runConnectionTest = async () => {
    if (!validationResult?.isValid) {
      return;
    }

    setIsTesting(true);
    const startTime = Date.now();

    try {
      const result = await testProviderConnection(providerType, credentials, configuration);
      const responseTime = Date.now() - startTime;
      
      const testResult: ConnectionTestResult = {
        ...result,
        responseTime,
        timestamp: new Date()
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 4)]); // Keep last 5 results
      onTestComplete?.(testResult);
    } catch (error) {
      const testResult: ConnectionTestResult = {
        success: false,
        message: 'Connection test failed',
        details: error,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 4)]);
      onTestComplete?.(testResult);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Validation</h3>
        
        {validationResult && (
          <div className="space-y-3">
            {/* Overall Status */}
            <div className="flex items-center">
              {validationResult.isValid ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className={`font-medium ${validationResult.isValid ? 'text-green-700' : 'text-red-700'}`}>
                {validationResult.isValid ? 'Configuration Valid' : 'Configuration Issues Found'}
              </span>
            </div>

            {/* Errors */}
            {Object.keys(validationResult.errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                {Object.entries(validationResult.errors).map(([field, errors]) => (
                  <div key={field} className="text-sm text-red-700">
                    <span className="font-medium">{field}:</span>
                    <ul className="list-disc list-inside ml-4">
                      {(errors as string[]).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {Object.keys(validationResult.warnings).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                {Object.entries(validationResult.warnings).map(([field, warnings]) => (
                  <div key={field} className="text-sm text-yellow-700">
                    <span className="font-medium">{field}:</span>
                    <ul className="list-disc list-inside ml-4">
                      {(warnings as string[]).map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {Object.keys(validationResult.suggestions).length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="font-medium text-blue-800 mb-2">Suggestions:</h4>
                {Object.entries(validationResult.suggestions).map(([field, suggestions]) => (
                  <div key={field} className="text-sm text-blue-700">
                    <ul className="list-disc list-inside">
                      {(suggestions as string[]).map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connection Testing */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Connection Test</h3>
          
          <button
            onClick={runConnectionTest}
            disabled={isTestingOrInvalid}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isTestingOrInvalid
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isTesting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Test Connection
              </>
            )}
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Recent Test Results</h4>
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-3 ${
                  result.success 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.message}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {result.responseTime}ms • {result.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {result.details && (
                  <div className="mt-2 text-sm text-gray-600">
                    <pre className="bg-gray-100 rounded p-2 text-xs overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Integration Checklist */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Checklist</h3>
        
        <div className="space-y-4">
          {/* Pre-Integration */}
          <div>
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <InformationCircleIcon className="h-4 w-4 mr-1 text-blue-500" />
              Pre-Integration
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {INTEGRATION_CHECKLIST.pre_integration.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 h-4 w-4 mt-0.5 mr-2 text-gray-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* During Integration */}
          <div>
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <ClockIcon className="h-4 w-4 mr-1 text-yellow-500" />
              During Integration
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {INTEGRATION_CHECKLIST.during_integration.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 h-4 w-4 mt-0.5 mr-2 text-gray-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Post-Integration */}
          <div>
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
              Post-Integration
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {INTEGRATION_CHECKLIST.post_integration.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 h-4 w-4 mt-0.5 mr-2 text-gray-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

}
'use client';

import React, { useState, useEffect } from 'react';

interface ConfigData {
  embedding: {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
  };
  llm: {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
  };
  fallback: {
    embeddingBaseUrl: string;
    embeddingModel: string;
    llmBaseUrl: string;
    llmModel: string;
  };
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  latency?: number;
}

export default function ConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmbedding, setTestingEmbedding] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('');
  const [embeddingApiKey, setEmbeddingApiKey] = useState('');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  
  // Test results
  const [embeddingTestResult, setEmbeddingTestResult] = useState<TestResult | null>(null);
  const [llmTestResult, setLlmTestResult] = useState<TestResult | null>(null);
  const [showEmbeddingKey, setShowEmbeddingKey] = useState(false);
  const [showLlmKey, setShowLlmKey] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const json = await res.json();
        
        if (json.success) {
          setConfig(json.data);
          setEmbeddingBaseUrl(json.data.embedding.baseUrl);
          setEmbeddingModel(json.data.embedding.model);
          setLlmBaseUrl(json.data.llm.baseUrl);
          setLlmModel(json.data.llm.model);
        } else {
          setError(json.error?.message || 'Failed to load config');
        }
      } catch (err) {
        setError('Failed to load config');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  const handleTestEmbedding = async () => {
    if (!embeddingBaseUrl) return;
    
    setTestingEmbedding(true);
    setEmbeddingTestResult(null);
    
    try {
      const res = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'embedding',
          baseUrl: embeddingBaseUrl,
          apiKey: embeddingApiKey || undefined,
          model: embeddingModel || undefined,
        }),
      });
      
      const json = await res.json();
      setEmbeddingTestResult(json);
    } catch (err) {
      setEmbeddingTestResult({ success: false, error: 'Failed to test connection' });
    } finally {
      setTestingEmbedding(false);
    }
  };

  const handleTestLlm = async () => {
    if (!llmBaseUrl) return;
    
    setTestingLlm(true);
    setLlmTestResult(null);
    
    try {
      const res = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'llm',
          baseUrl: llmBaseUrl,
          apiKey: llmApiKey || undefined,
          model: llmModel || undefined,
        }),
      });
      
      const json = await res.json();
      setLlmTestResult(json);
    } catch (err) {
      setLlmTestResult({ success: false, error: 'Failed to test connection' });
    } finally {
      setTestingLlm(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding: {
            baseUrl: embeddingBaseUrl,
            model: embeddingModel,
            apiKey: embeddingApiKey,
          },
          llm: {
            baseUrl: llmBaseUrl,
            model: llmModel,
            apiKey: llmApiKey,
          },
        }),
      });
      
      const json = await res.json();
      
      if (json.success) {
        alert('Configuration saved successfully!');
        // Reload config
        const reloadRes = await fetch('/api/config');
        const reloadJson = await reloadRes.json();
        if (reloadJson.success) {
          setConfig(reloadJson.data);
        }
      } else {
        alert('Failed to save: ' + json.error?.message);
      }
    } catch (err) {
      alert('Failed to save configuration');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-error-container text-error rounded-xl">
        <h2 className="font-headline text-lg mb-2">Error Loading Configuration</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline text-2xl text-on-surface mb-2">
          AI Model Configuration
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Configure your AI model endpoints, API keys, and model preferences.
        </p>
      </div>

      {/* Config Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embedding Configuration */}
        <div className="bg-surface border border-outline-variant rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary">auto_awesome</span>
              <div>
                <h2 className="font-headline text-lg text-on-surface">Embedding Model</h2>
                <p className="text-body-sm text-on-surface-variant">Text embedding configuration</p>
              </div>
            </div>
            {embeddingTestResult && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                embeddingTestResult.success 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {embeddingTestResult.success ? 'Connected' : 'Failed'}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Base URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm text-on-surface-variant">Base URL</label>
              <input
                type="text"
                value={embeddingBaseUrl}
                onChange={(e) => setEmbeddingBaseUrl(e.target.value)}
                placeholder={config?.fallback.embeddingBaseUrl || 'http://localhost:20128/v1'}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Model Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm text-on-surface-variant">Model Name</label>
              <input
                type="text"
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                placeholder={config?.fallback.embeddingModel || 'text-embedding-ada-002'}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm text-on-surface-variant">API Key</label>
              <div className="relative">
                <input
                  type={showEmbeddingKey ? 'text' : 'password'}
                  value={embeddingApiKey}
                  onChange={(e) => setEmbeddingApiKey(e.target.value)}
                  placeholder={config?.embedding.hasApiKey ? '••••••••••••' : 'sk-...'}
                  className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowEmbeddingKey(!showEmbeddingKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showEmbeddingKey ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-2">
              <button
                onClick={handleTestEmbedding}
                disabled={testingEmbedding || !embeddingBaseUrl}
                className="w-full bg-surface-container-low border border-outline-variant text-on-surface rounded-xl px-4 py-2.5 hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testingEmbedding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">wifi_check</span>
                    Test Connection
                  </>
                )}
              </button>
              {embeddingTestResult && (
                <p className={`text-body-sm mt-2 ${
                  embeddingTestResult.success ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {embeddingTestResult.success 
                    ? `✓ Connected (${embeddingTestResult.latency}ms)` 
                    : `✗ ${embeddingTestResult.error}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* LLM Configuration */}
        <div className="bg-surface border border-outline-variant rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary">psychology</span>
              <div>
                <h2 className="font-headline text-lg text-on-surface">LLM Model</h2>
                <p className="text-body-sm text-on-surface-variant">Chat completion configuration</p>
              </div>
            </div>
            {llmTestResult && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                llmTestResult.success 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {llmTestResult.success ? 'Connected' : 'Failed'}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Base URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm text-on-surface-variant">Base URL</label>
              <input
                type="text"
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                placeholder={config?.fallback.llmBaseUrl || 'http://localhost:20128/v1'}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Model Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm text-on-surface-variant">Model Name</label>
              <input
                type="text"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder={config?.fallback.llmModel || 'gpt-4o-mini'}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm text-on-surface-variant">API Key</label>
              <div className="relative">
                <input
                  type={showLlmKey ? 'text' : 'password'}
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder={config?.llm.hasApiKey ? '••••••••••••' : 'sk-...'}
                  className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowLlmKey(!showLlmKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showLlmKey ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-2">
              <button
                onClick={handleTestLlm}
                disabled={testingLlm || !llmBaseUrl}
                className="w-full bg-surface-container-low border border-outline-variant text-on-surface rounded-xl px-4 py-2.5 hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testingLlm ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">wifi_check</span>
                    Test Connection
                  </>
                )}
              </button>
              {llmTestResult && (
                <p className={`text-body-sm mt-2 ${
                  llmTestResult.success ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {llmTestResult.success 
                    ? `✓ Connected (${llmTestResult.latency}ms)` 
                    : `✗ ${llmTestResult.error}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-outline-variant">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-on-primary rounded-xl px-6 py-2.5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary"></div>
              Saving...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">save</span>
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
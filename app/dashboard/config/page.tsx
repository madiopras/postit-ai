'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Eye, EyeOff, Save, Sparkles, Wifi } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigData {
  embedding: {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
    apiKeyPreview: string;
  };
  llm: {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
    apiKeyPreview: string;
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
    } catch {
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
    } catch {
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
        // An untouched key field is omitted, not sent as ''. Sending '' would
        // clear the stored key — and since the field is never pre-filled, that
        // used to happen on every save that only changed a model name.
        body: JSON.stringify({
          embedding: {
            baseUrl: embeddingBaseUrl,
            model: embeddingModel,
            ...(embeddingApiKey ? { apiKey: embeddingApiKey } : {}),
          },
          llm: {
            baseUrl: llmBaseUrl,
            model: llmModel,
            ...(llmApiKey ? { apiKey: llmApiKey } : {}),
          },
        }),
      });
      
      const json = await res.json();
      
      if (json.success) {
        toast.success('Konfigurasi tersimpan');
        // Clear the key inputs: their value is now stored, and leaving them
        // filled would re-send the same secret on the next save.
        setEmbeddingApiKey('');
        setLlmApiKey('');

        const reloadRes = await fetch('/api/config');
        const reloadJson = await reloadRes.json();
        if (reloadJson.success) {
          setConfig(reloadJson.data);
        }
      } else {
        toast.error(json.error?.message ?? 'Gagal menyimpan konfigurasi');
      }
    } catch (err) {
      toast.error('Gagal menyimpan konfigurasi');
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
      <div className="p-6 bg-destructive/10 text-destructive rounded-xl">
        <h2 className="font-headline text-lg mb-2">Error Loading Configuration</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline text-2xl text-foreground mb-2">
          AI Model Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure your AI model endpoints, API keys, and model preferences.
        </p>
      </div>

      {/* Config Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embedding Configuration */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="size-6 text-primary" />
              <div>
                <h2 className="font-headline text-lg text-foreground">Embedding Model</h2>
                <p className="text-xs text-muted-foreground">Text embedding configuration</p>
              </div>
            </div>
            {embeddingTestResult && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                embeddingTestResult.success 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {embeddingTestResult.success ? 'Connected' : 'Failed'}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Base URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Base URL</label>
              <input
                type="text"
                value={embeddingBaseUrl}
                onChange={(e) => setEmbeddingBaseUrl(e.target.value)}
                placeholder={config?.fallback.embeddingBaseUrl || 'http://localhost:20128/v1'}
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Model Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Model Name</label>
              <input
                type="text"
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                placeholder={config?.fallback.embeddingModel || 'text-embedding-ada-002'}
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">API Key</label>
              <div className="relative">
                <input
                  type={showEmbeddingKey ? 'text' : 'password'}
                  value={embeddingApiKey}
                  onChange={(e) => setEmbeddingApiKey(e.target.value)}
                  placeholder={config?.embedding.hasApiKey ? `Tersimpan: ${config.embedding.apiKeyPreview} — isi untuk mengganti` : 'sk-...'}
                  className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowEmbeddingKey(!showEmbeddingKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showEmbeddingKey ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-2">
              <button
                onClick={handleTestEmbedding}
                disabled={testingEmbedding || !embeddingBaseUrl}
                className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testingEmbedding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi className="size-[18px]" />
                    Test Connection
                  </>
                )}
              </button>
              {embeddingTestResult && (
                <p className={`text-xs mt-2 ${
                  embeddingTestResult.success ? 'text-success' : 'text-destructive'
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
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Brain className="size-6 text-primary" />
              <div>
                <h2 className="font-headline text-lg text-foreground">LLM Model</h2>
                <p className="text-xs text-muted-foreground">Chat completion configuration</p>
              </div>
            </div>
            {llmTestResult && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                llmTestResult.success 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {llmTestResult.success ? 'Connected' : 'Failed'}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Base URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Base URL</label>
              <input
                type="text"
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                placeholder={config?.fallback.llmBaseUrl || 'http://localhost:20128/v1'}
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Model Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Model Name</label>
              <input
                type="text"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder={config?.fallback.llmModel || 'gpt-4o-mini'}
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">API Key</label>
              <div className="relative">
                <input
                  type={showLlmKey ? 'text' : 'password'}
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder={config?.llm.hasApiKey ? `Tersimpan: ${config.llm.apiKeyPreview} — isi untuk mengganti` : 'sk-...'}
                  className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowLlmKey(!showLlmKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showLlmKey ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-2">
              <button
                onClick={handleTestLlm}
                disabled={testingLlm || !llmBaseUrl}
                className="w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testingLlm ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi className="size-[18px]" />
                    Test Connection
                  </>
                )}
              </button>
              {llmTestResult && (
                <p className={`text-xs mt-2 ${
                  llmTestResult.success ? 'text-success' : 'text-destructive'
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
      <div className="flex justify-end pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground rounded-xl px-6 py-2.5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="size-[18px]" />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
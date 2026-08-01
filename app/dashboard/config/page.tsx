'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Brain, Eye, EyeOff, RotateCcw, Save, Search, ShieldCheck, SlidersHorizontal, Sparkles, Wifi } from 'lucide-react';
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
  behaviour: {
    persona: string;
    tone: 'formal' | 'professional' | 'friendly';
    detailLevel: 'concise' | 'medium' | 'detailed';
    language: 'same_as_user' | 'id' | 'en';
    useEmoji: boolean;
  };
  responseRules: {
    knowledgeOnly: boolean;
    noHallucination: boolean;
    fallbackMessage: string;
    enforceDocumentAccess: true;
  };
  responseDictionary: {
    forbiddenWords: string[];
    requiredWords: Array<{ phrase: string; condition: string }>;
  };
  retrieval: {
    topK: number;
    similarityThreshold: number;
    sourcePriority: 'balanced' | 'faq_first' | 'sop_first';
    selectionRule: 'highest_score' | 'diverse_sources';
    maxContextDocuments: number;
  };
  fallback: {
    embeddingBaseUrl: string;
    embeddingModel: string;
    llmBaseUrl: string;
    llmModel: string;
  };
}

/**
 * Unwrap the API envelope into the shape this page renders.
 *
 * The response is `{ success, message, data: { latency } }` on success and
 * `{ success: false, error: { code, message } }` on failure. Storing it raw
 * showed "Connected (undefinedms)" — latency sits under `data` — and would have
 * rendered "[object Object]" for a failure, since `error` is an object.
 */
function toTestResult(json: {
  success?: boolean;
  data?: { latency?: number };
  error?: { message?: string } | string;
}): TestResult {
  if (json.success) {
    return { success: true, latency: json.data?.latency };
  }
  const message = typeof json.error === 'string' ? json.error : json.error?.message;
  return { success: false, error: message ?? 'Gagal terhubung' };
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
  const [resetting, setResetting] = useState(false);
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
  const [persona, setPersona] = useState('');
  const [tone, setTone] = useState<ConfigData['behaviour']['tone']>('professional');
  const [detailLevel, setDetailLevel] =
    useState<ConfigData['behaviour']['detailLevel']>('medium');
  const [language, setLanguage] =
    useState<ConfigData['behaviour']['language']>('same_as_user');
  const [useEmoji, setUseEmoji] = useState(false);
  const [knowledgeOnly, setKnowledgeOnly] = useState(true);
  const [noHallucination, setNoHallucination] = useState(true);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [forbiddenWordsText, setForbiddenWordsText] = useState('');
  const [requiredWordsText, setRequiredWordsText] = useState('');
  const [retrievalTopK, setRetrievalTopK] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [sourcePriority, setSourcePriority] =
    useState<ConfigData['retrieval']['sourcePriority']>('balanced');
  const [selectionRule, setSelectionRule] =
    useState<ConfigData['retrieval']['selectionRule']>('highest_score');
  const [maxContextDocuments, setMaxContextDocuments] = useState(5);
  
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
          setPersona(json.data.behaviour.persona);
          setTone(json.data.behaviour.tone);
          setDetailLevel(json.data.behaviour.detailLevel);
          setLanguage(json.data.behaviour.language);
          setUseEmoji(json.data.behaviour.useEmoji);
          setKnowledgeOnly(json.data.responseRules.knowledgeOnly);
          setNoHallucination(json.data.responseRules.noHallucination);
          setFallbackMessage(json.data.responseRules.fallbackMessage);
          setForbiddenWordsText(json.data.responseDictionary.forbiddenWords.join('\n'));
          setRequiredWordsText(
            json.data.responseDictionary.requiredWords
              .map((rule: { phrase: string; condition: string }) =>
                rule.condition ? `${rule.phrase} | ${rule.condition}` : rule.phrase
              )
              .join('\n')
          );
          setRetrievalTopK(json.data.retrieval.topK);
          setSimilarityThreshold(json.data.retrieval.similarityThreshold);
          setSourcePriority(json.data.retrieval.sourcePriority);
          setSelectionRule(json.data.retrieval.selectionRule);
          setMaxContextDocuments(json.data.retrieval.maxContextDocuments);
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
      
      setEmbeddingTestResult(toTestResult(await res.json()));
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
      
      setLlmTestResult(toTestResult(await res.json()));
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
          behaviour: {
            persona,
            tone,
            detailLevel,
            language,
            useEmoji,
          },
          responseRules: {
            knowledgeOnly,
            noHallucination,
            fallbackMessage,
          },
          responseDictionary: {
            forbiddenWords: forbiddenWordsText
              .split('\n')
              .map((phrase) => phrase.trim())
              .filter(Boolean),
            requiredWords: requiredWordsText
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [phrase, ...condition] = line.split('|');
                return {
                  phrase: phrase.trim(),
                  condition: condition.join('|').trim(),
                };
              }),
          },
          retrieval: {
            topK: retrievalTopK,
            similarityThreshold,
            sourcePriority,
            selectionRule,
            maxContextDocuments,
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

  const handleReset = async () => {
    if (!window.confirm(
      'Hapus seluruh konfigurasi AI tersimpan, termasuk riwayat API key? '
      + 'Sistem akan kembali menggunakan environment variables dan default.'
    )) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch('/api/config', { method: 'DELETE' });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.error?.message ?? 'Gagal mereset konfigurasi');
        return;
      }

      const reloadResponse = await fetch('/api/config');
      const reloadJson = await reloadResponse.json();
      if (!reloadJson.success) {
        toast.error(reloadJson.error?.message ?? 'Konfigurasi dihapus tetapi gagal dimuat ulang');
        return;
      }

      const data: ConfigData = reloadJson.data;
      setConfig(data);
      setEmbeddingBaseUrl(data.embedding.baseUrl);
      setEmbeddingModel(data.embedding.model);
      setEmbeddingApiKey('');
      setLlmBaseUrl(data.llm.baseUrl);
      setLlmModel(data.llm.model);
      setLlmApiKey('');
      setPersona(data.behaviour.persona);
      setTone(data.behaviour.tone);
      setDetailLevel(data.behaviour.detailLevel);
      setLanguage(data.behaviour.language);
      setUseEmoji(data.behaviour.useEmoji);
      setKnowledgeOnly(data.responseRules.knowledgeOnly);
      setNoHallucination(data.responseRules.noHallucination);
      setFallbackMessage(data.responseRules.fallbackMessage);
      setForbiddenWordsText(data.responseDictionary.forbiddenWords.join('\n'));
      setRequiredWordsText(
        data.responseDictionary.requiredWords
          .map((rule) => rule.condition ? `${rule.phrase} | ${rule.condition}` : rule.phrase)
          .join('\n')
      );
      setRetrievalTopK(data.retrieval.topK);
      setSimilarityThreshold(data.retrieval.similarityThreshold);
      setSourcePriority(data.retrieval.sourcePriority);
      setSelectionRule(data.retrieval.selectionRule);
      setMaxContextDocuments(data.retrieval.maxContextDocuments);
      setEmbeddingTestResult(null);
      setLlmTestResult(null);
      toast.success('Konfigurasi tersimpan dihapus; fallback sekarang aktif');
    } catch (resetError) {
      console.error(resetError);
      toast.error('Gagal mereset konfigurasi');
    } finally {
      setResetting(false);
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
          AI Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure model endpoints and the assistant&apos;s response behaviour.
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
                    ? `✓ Terhubung${embeddingTestResult.latency !== undefined ? ` (${embeddingTestResult.latency}ms)` : ''}`
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
                    ? `✓ Terhubung${llmTestResult.latency !== undefined ? ` (${llmTestResult.latency}ms)` : ''}`
                    : `✗ ${llmTestResult.error}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <SlidersHorizontal className="size-6 text-primary" />
          <div>
            <h2 className="font-headline text-lg text-foreground">AI Behaviour</h2>
            <p className="text-xs text-muted-foreground">
              These settings are included in every system prompt.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Persona</label>
            <textarea
              value={persona}
              onChange={(event) => setPersona(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Describe the assistant's role and identity"
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <span className="text-xs text-muted-foreground text-right">
              {persona.length}/2000
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tone</label>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value as ConfigData['behaviour']['tone'])}
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
              >
                <option value="formal">Formal</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Detail level</label>
              <select
                value={detailLevel}
                onChange={(event) =>
                  setDetailLevel(event.target.value as ConfigData['behaviour']['detailLevel'])
                }
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
              >
                <option value="concise">Concise</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Language</label>
              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as ConfigData['behaviour']['language'])
                }
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
              >
                <option value="same_as_user">Follow user language</option>
                <option value="id">Indonesian</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border bg-muted p-4">
            <div>
              <span className="text-sm font-medium text-foreground">Use emoji</span>
              <p className="text-xs text-muted-foreground">
                Allow the assistant to use emoji naturally when appropriate.
              </p>
            </div>
            <input
              type="checkbox"
              checked={useEmoji}
              onChange={(event) => setUseEmoji(event.target.checked)}
              className="size-4 accent-primary"
            />
          </label>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="size-6 text-primary" />
          <div>
            <h2 className="font-headline text-lg text-foreground">Response Rules</h2>
            <p className="text-xs text-muted-foreground">
              Control how answers are grounded and how missing information is handled.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between rounded-xl border border-border bg-muted p-4">
            <div>
              <span className="text-sm font-medium text-foreground">Knowledge Base only</span>
              <p className="text-xs text-muted-foreground">
                Require answers to use only context retrieved from the Knowledge Base.
              </p>
            </div>
            <input
              type="checkbox"
              checked={knowledgeOnly}
              onChange={(event) => setKnowledgeOnly(event.target.checked)}
              className="size-4 accent-primary"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-border bg-muted p-4">
            <div>
              <span className="text-sm font-medium text-foreground">No hallucination policy</span>
              <p className="text-xs text-muted-foreground">
                Explicitly prohibit unsupported claims in generated answers.
              </p>
            </div>
            <input
              type="checkbox"
              checked={noHallucination}
              onChange={(event) => setNoHallucination(event.target.checked)}
              className="size-4 accent-primary"
            />
          </label>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted p-4">
            <div>
              <span className="text-sm font-medium text-foreground">
                Enforce document access
              </span>
              <p className="text-xs text-muted-foreground">
                Restricted SOP content is always filtered before context reaches the LLM.
              </p>
            </div>
            <span className="rounded-full bg-success/10 px-2 py-1 text-xs text-success">
              Always on
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Missing-information fallback
            </label>
            <textarea
              value={fallbackMessage}
              onChange={(event) => setFallbackMessage(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Message returned when no accessible Knowledge Base source is found"
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <span className="text-xs text-muted-foreground text-right">
              {fallbackMessage.length}/2000
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="size-6 text-primary" />
          <div>
            <h2 className="font-headline text-lg text-foreground">Response Dictionary</h2>
            <p className="text-xs text-muted-foreground">
              Maintain phrases that must be excluded or included in generated answers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Forbidden phrases
            </label>
            <textarea
              value={forbiddenWordsText}
              onChange={(event) => setForbiddenWordsText(event.target.value)}
              rows={8}
              placeholder={'internal secret\nunapproved claim'}
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <span className="text-xs text-muted-foreground">
              One phrase per line. Matching is case-insensitive.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Required phrase rules
            </label>
            <textarea
              value={requiredWordsText}
              onChange={(event) => setRequiredWordsText(event.target.value)}
              rows={8}
              placeholder={'Contact HR | employee\nTerms and conditions apply'}
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <span className="text-xs text-muted-foreground">
              Use “phrase | condition”. Omit the condition to require the phrase in every answer.
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Search className="size-6 text-primary" />
          <div>
            <h2 className="font-headline text-lg text-foreground">
              Retrieval Configuration
            </h2>
            <p className="text-xs text-muted-foreground">
              Control candidate retrieval and the context sent to the LLM.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Top K candidates</label>
            <input
              type="number"
              min={1}
              max={50}
              value={retrievalTopK}
              onChange={(event) => {
                const value = Number(event.target.value);
                setRetrievalTopK(value);
                setMaxContextDocuments((current) => Math.min(current, value));
              }}
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Maximum context documents
            </label>
            <input
              type="number"
              min={1}
              max={Math.min(20, retrievalTopK)}
              value={maxContextDocuments}
              onChange={(event) => setMaxContextDocuments(Number(event.target.value))}
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Similarity threshold: {similarityThreshold.toFixed(2)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={similarityThreshold}
              onChange={(event) => setSimilarityThreshold(Number(event.target.value))}
              className="accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Higher values require a closer semantic match.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Source priority</label>
            <select
              value={sourcePriority}
              onChange={(event) =>
                setSourcePriority(event.target.value as ConfigData['retrieval']['sourcePriority'])
              }
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
            >
              <option value="balanced">Balanced by relevance</option>
              <option value="faq_first">FAQ first</option>
              <option value="sop_first">SOP first</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Selection rule</label>
            <select
              value={selectionRule}
              onChange={(event) =>
                setSelectionRule(event.target.value as ConfigData['retrieval']['selectionRule'])
              }
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
            >
              <option value="highest_score">Highest score</option>
              <option value="diverse_sources">Alternate FAQ and SOP</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Selection runs only after authentication and document-access filters.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving || resetting}
          className="border border-destructive/40 text-destructive rounded-xl px-6 py-2.5 hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {resetting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
              Resetting...
            </>
          ) : (
            <>
              <RotateCcw className="size-[18px]" />
              Delete Stored Configuration
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || resetting}
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

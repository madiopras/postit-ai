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
          setError(json.error?.message || 'Gagal memuat konfigurasi');
        }
      } catch (err) {
        setError('Gagal memuat konfigurasi');
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
      setEmbeddingTestResult({ success: false, error: 'Gagal menguji koneksi' });
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
      setLlmTestResult({ success: false, error: 'Gagal menguji koneksi' });
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
      <div role="alert" className="rounded-ui-xl border border-error-border bg-error-bg p-6 text-error-fg">
        <h2 className="font-headline text-lg mb-2">Konfigurasi gagal dimuat</h2>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-ui-md border border-error-border bg-bg-primary px-3 py-2 text-sm font-semibold text-fg-secondary outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline text-2xl text-foreground mb-2">
          Konfigurasi AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Atur endpoint model dan perilaku jawaban asisten.
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
                <h2 className="font-headline text-lg text-foreground">Model embedding</h2>
                <p className="text-xs text-muted-foreground">Konfigurasi embedding teks</p>
              </div>
            </div>
            {embeddingTestResult && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                embeddingTestResult.success 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {embeddingTestResult.success ? 'Terhubung' : 'Gagal'}
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
              <label className="text-xs font-medium text-muted-foreground">Nama model</label>
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
              <label className="text-xs font-medium text-muted-foreground">Kunci API</label>
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
                    Menguji…
                  </>
                ) : (
                  <>
                    <Wifi className="size-[18px]" />
                    Uji koneksi
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
                <h2 className="font-headline text-lg text-foreground">Model LLM</h2>
                <p className="text-xs text-muted-foreground">Konfigurasi penyelesaian chat</p>
              </div>
            </div>
            {llmTestResult && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                llmTestResult.success 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {llmTestResult.success ? 'Terhubung' : 'Gagal'}
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
              <label className="text-xs font-medium text-muted-foreground">Nama model</label>
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
              <label className="text-xs font-medium text-muted-foreground">Kunci API</label>
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
                    Menguji…
                  </>
                ) : (
                  <>
                    <Wifi className="size-[18px]" />
                    Uji koneksi
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
            <h2 className="font-headline text-lg text-foreground">Perilaku AI</h2>
            <p className="text-xs text-muted-foreground">
              Pengaturan ini disertakan dalam setiap system prompt.
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
              placeholder="Jelaskan peran dan identitas asisten"
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <span className="text-xs text-muted-foreground text-right">
              {persona.length}/2000
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nada</label>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value as ConfigData['behaviour']['tone'])}
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
              >
                <option value="formal">Formal</option>
                <option value="professional">Profesional</option>
                <option value="friendly">Ramah</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tingkat detail</label>
              <select
                value={detailLevel}
                onChange={(event) =>
                  setDetailLevel(event.target.value as ConfigData['behaviour']['detailLevel'])
                }
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
              >
                <option value="concise">Ringkas</option>
                <option value="medium">Sedang</option>
                <option value="detailed">Terperinci</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Bahasa</label>
              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as ConfigData['behaviour']['language'])
                }
                className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
              >
                <option value="same_as_user">Ikuti bahasa pengguna</option>
                <option value="id">Bahasa Indonesia</option>
                <option value="en">Bahasa Inggris</option>
              </select>
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border bg-muted p-4">
            <div>
              <span className="text-sm font-medium text-foreground">Gunakan emoji</span>
              <p className="text-xs text-muted-foreground">
                Izinkan asisten memakai emoji saat sesuai.
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
            <h2 className="font-headline text-lg text-foreground">Aturan jawaban</h2>
            <p className="text-xs text-muted-foreground">
              Atur dasar jawaban dan penanganan informasi yang tidak ditemukan.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between rounded-xl border border-border bg-muted p-4">
            <div>
              <span className="text-sm font-medium text-foreground">Hanya knowledge base</span>
              <p className="text-xs text-muted-foreground">
                Wajibkan jawaban hanya memakai konteks dari knowledge base.
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
              <span className="text-sm font-medium text-foreground">Kebijakan tanpa halusinasi</span>
              <p className="text-xs text-muted-foreground">
                Larang klaim tanpa dukungan sumber pada jawaban.
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
                Terapkan akses dokumen
              </span>
              <p className="text-xs text-muted-foreground">
                Konten SOP terbatas selalu disaring sebelum konteks mencapai LLM.
              </p>
            </div>
            <span className="rounded-full bg-success/10 px-2 py-1 text-xs text-success">
              Selalu aktif
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Pesan saat informasi tidak ditemukan
            </label>
            <textarea
              value={fallbackMessage}
              onChange={(event) => setFallbackMessage(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Pesan saat sumber knowledge base yang dapat diakses tidak ditemukan"
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
            <h2 className="font-headline text-lg text-foreground">Kamus jawaban</h2>
            <p className="text-xs text-muted-foreground">
              Kelola frasa yang dilarang atau wajib disertakan dalam jawaban.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Frasa terlarang
            </label>
            <textarea
              value={forbiddenWordsText}
              onChange={(event) => setForbiddenWordsText(event.target.value)}
              rows={8}
              placeholder={'internal secret\nunapproved claim'}
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <span className="text-xs text-muted-foreground">
              Satu frasa per baris. Pencocokan tidak peka huruf besar/kecil.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Aturan frasa wajib
            </label>
            <textarea
              value={requiredWordsText}
              onChange={(event) => setRequiredWordsText(event.target.value)}
              rows={8}
              placeholder={'Contact HR | employee\nTerms and conditions apply'}
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <span className="text-xs text-muted-foreground">
              Gunakan “frasa | kondisi”. Kosongkan kondisi agar frasa wajib di setiap jawaban.
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Search className="size-6 text-primary" />
          <div>
            <h2 className="font-headline text-lg text-foreground">
              Konfigurasi pencarian
            </h2>
            <p className="text-xs text-muted-foreground">
              Atur kandidat pencarian dan konteks yang dikirim ke LLM.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kandidat Top K</label>
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
              Maksimal dokumen konteks
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
              Ambang kemiripan: {similarityThreshold.toFixed(2)}
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
              Berlaku untuk jalur semantik; istilah persis tetap dapat ditemukan oleh full-text.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Prioritas sumber</label>
            <select
              value={sourcePriority}
              onChange={(event) =>
                setSourcePriority(event.target.value as ConfigData['retrieval']['sourcePriority'])
              }
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
            >
              <option value="balanced">Seimbang berdasarkan relevansi</option>
              <option value="faq_first">FAQ terlebih dahulu</option>
              <option value="sop_first">SOP terlebih dahulu</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Aturan pemilihan</label>
            <select
              value={selectionRule}
              onChange={(event) =>
                setSelectionRule(event.target.value as ConfigData['retrieval']['selectionRule'])
              }
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground"
            >
              <option value="highest_score">Skor tertinggi</option>
              <option value="diverse_sources">Selang-seling FAQ dan SOP</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Pemilihan dijalankan setelah autentikasi dan filter akses dokumen.
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
              Menghapus…
            </>
          ) : (
            <>
              <RotateCcw className="size-[18px]" />
              Hapus konfigurasi tersimpan
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
              Menyimpan…
            </>
          ) : (
            <>
              <Save className="size-[18px]" />
              Simpan konfigurasi
            </>
          )}
        </button>
      </div>
    </div>
  );
}

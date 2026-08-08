'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Brain, Eye, EyeOff, Loader2, RotateCcw, Save, Search, ShieldCheck, SlidersHorizontal, Sparkles, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/dashboard/dashboard-ui';

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
      <div role="alert" className="alert alert-error">
        <div>
          <h2 className="text-lg font-semibold mb-1">Konfigurasi gagal dimuat</h2>
          <p>{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-base-content mb-2">
          Konfigurasi AI
        </h1>
        <p className="text-sm text-base-content/60">
          Atur endpoint model dan perilaku jawaban asisten.
        </p>
      </div>

      {/* Config Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embedding Configuration */}
        <div className="card card-border bg-base-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="size-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-base-content">Model embedding</h2>
                <p className="text-xs text-base-content/60">Konfigurasi embedding teks</p>
              </div>
            </div>
            {embeddingTestResult && (
              <span className={`badge badge-sm ${
                embeddingTestResult.success 
                  ? 'badge-success badge-soft' 
                  : 'badge-error badge-soft'
              }`}>
                {embeddingTestResult.success ? 'Terhubung' : 'Gagal'}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Base URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-base-content/70">Base URL</label>
              <input
                type="text"
                value={embeddingBaseUrl}
                onChange={(e) => setEmbeddingBaseUrl(e.target.value)}
                placeholder={config?.fallback.embeddingBaseUrl || 'http://localhost:20128/v1'}
                className="input input-bordered w-full text-sm"
              />
            </div>

            {/* Model Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-base-content/70">Nama model</label>
              <input
                type="text"
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                placeholder={config?.fallback.embeddingModel || 'text-embedding-ada-002'}
                className="input input-bordered w-full text-sm"
              />
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-base-content/70">Kunci API</label>
              <div className="relative">
                <input
                  type={showEmbeddingKey ? 'text' : 'password'}
                  value={embeddingApiKey}
                  onChange={(e) => setEmbeddingApiKey(e.target.value)}
                  placeholder={config?.embedding.hasApiKey ? `Tersimpan: ${config.embedding.apiKeyPreview} — isi untuk mengganti` : 'sk-...'}
                  className="input input-bordered w-full text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowEmbeddingKey(!showEmbeddingKey)}
                  className="btn btn-ghost btn-square btn-xs absolute right-2 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                >
                  {showEmbeddingKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleTestEmbedding}
                disabled={testingEmbedding || !embeddingBaseUrl}
                className="w-full"
              >
                {testingEmbedding ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menguji…
                  </>
                ) : (
                  <>
                    <Wifi className="size-4" />
                    Uji koneksi
                  </>
                )}
              </Button>
              {embeddingTestResult && (
                <p className={`text-xs mt-2 ${
                  embeddingTestResult.success ? 'text-success' : 'text-error'
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
        <div className="card card-border bg-base-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Brain className="size-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-base-content">Model LLM</h2>
                <p className="text-xs text-base-content/60">Konfigurasi penyelesaian chat</p>
              </div>
            </div>
            {llmTestResult && (
              <span className={`badge badge-sm ${
                llmTestResult.success 
                  ? 'badge-success badge-soft' 
                  : 'badge-error badge-soft'
              }`}>
                {llmTestResult.success ? 'Terhubung' : 'Gagal'}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Base URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-base-content/70">Base URL</label>
              <input
                type="text"
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                placeholder={config?.fallback.llmBaseUrl || 'http://localhost:20128/v1'}
                className="input input-bordered w-full text-sm"
              />
            </div>

            {/* Model Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-base-content/70">Nama model</label>
              <input
                type="text"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder={config?.fallback.llmModel || 'gpt-4o-mini'}
                className="input input-bordered w-full text-sm"
              />
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-base-content/70">Kunci API</label>
              <div className="relative">
                <input
                  type={showLlmKey ? 'text' : 'password'}
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder={config?.llm.hasApiKey ? `Tersimpan: ${config.llm.apiKeyPreview} — isi untuk mengganti` : 'sk-...'}
                  className="input input-bordered w-full text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowLlmKey(!showLlmKey)}
                  className="btn btn-ghost btn-square btn-xs absolute right-2 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                >
                  {showLlmKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleTestLlm}
                disabled={testingLlm || !llmBaseUrl}
                className="w-full"
              >
                {testingLlm ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menguji…
                  </>
                ) : (
                  <>
                    <Wifi className="size-4" />
                    Uji koneksi
                  </>
                )}
              </Button>
              {llmTestResult && (
                <p className={`text-xs mt-2 ${
                  llmTestResult.success ? 'text-success' : 'text-error'
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

      <div className="card card-border bg-base-100 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <SlidersHorizontal className="size-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-base-content">Perilaku AI</h2>
            <p className="text-xs text-base-content/60">
              Pengaturan ini disertakan dalam setiap system prompt.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-base-content/70">Persona</label>
            <textarea
              value={persona}
              onChange={(event) => setPersona(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Jelaskan peran dan identitas asisten"
              className="textarea textarea-bordered w-full text-sm"
            />
            <span className="text-xs text-base-content/60 text-right">
              {persona.length}/2000
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-base-content/70">Nada</label>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value as ConfigData['behaviour']['tone'])}
                className="select select-bordered w-full text-sm"
              >
                <option value="formal">Formal</option>
                <option value="professional">Profesional</option>
                <option value="friendly">Ramah</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-base-content/70">Tingkat detail</label>
              <select
                value={detailLevel}
                onChange={(event) =>
                  setDetailLevel(event.target.value as ConfigData['behaviour']['detailLevel'])
                }
                className="select select-bordered w-full text-sm"
              >
                <option value="concise">Ringkas</option>
                <option value="medium">Sedang</option>
                <option value="detailed">Terperinci</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-base-content/70">Bahasa</label>
              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as ConfigData['behaviour']['language'])
                }
                className="select select-bordered w-full text-sm"
              >
                <option value="same_as_user">Ikuti bahasa pengguna</option>
                <option value="id">Bahasa Indonesia</option>
                <option value="en">Bahasa Inggris</option>
              </select>
            </div>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-base-200 bg-base-200/40 p-4">
            <div>
              <span className="text-sm font-medium text-base-content">Gunakan emoji</span>
              <p className="text-xs text-base-content/60">
                Izinkan asisten memakai emoji saat sesuai.
              </p>
            </div>
            <input
              type="checkbox"
              checked={useEmoji}
              onChange={(event) => setUseEmoji(event.target.checked)}
              className="toggle toggle-primary"
            />
          </label>
        </div>
      </div>

      <div className="card card-border bg-base-100 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="size-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-base-content">Aturan jawaban</h2>
            <p className="text-xs text-base-content/60">
              Atur dasar jawaban dan penanganan informasi yang tidak ditemukan.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between rounded-lg border border-base-200 bg-base-200/40 p-4">
            <div>
              <span className="text-sm font-medium text-base-content">Hanya knowledge base</span>
              <p className="text-xs text-base-content/60">
                Wajibkan jawaban hanya memakai konteks dari knowledge base.
              </p>
            </div>
            <input
              type="checkbox"
              checked={knowledgeOnly}
              onChange={(event) => setKnowledgeOnly(event.target.checked)}
              className="toggle toggle-primary"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-base-200 bg-base-200/40 p-4">
            <div>
              <span className="text-sm font-medium text-base-content">Kebijakan tanpa halusinasi</span>
              <p className="text-xs text-base-content/60">
                Larang klaim tanpa dukungan sumber pada jawaban.
              </p>
            </div>
            <input
              type="checkbox"
              checked={noHallucination}
              onChange={(event) => setNoHallucination(event.target.checked)}
              className="toggle toggle-primary"
            />
          </label>

          <div className="flex items-center justify-between rounded-lg border border-base-200 bg-base-200/40 p-4">
            <div>
              <span className="text-sm font-medium text-base-content">
                Terapkan akses dokumen
              </span>
              <p className="text-xs text-base-content/60">
                Konten SOP terbatas selalu disaring sebelum konteks mencapai LLM.
              </p>
            </div>
            <span className="badge badge-success badge-soft text-xs">
              Selalu aktif
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-base-content/70">
              Pesan saat informasi tidak ditemukan
            </label>
            <textarea
              value={fallbackMessage}
              onChange={(event) => setFallbackMessage(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Pesan saat sumber knowledge base yang dapat diakses tidak ditemukan"
              className="textarea textarea-bordered w-full text-sm"
            />
            <span className="text-xs text-base-content/60 text-right">
              {fallbackMessage.length}/2000
            </span>
          </div>
        </div>
      </div>

      <div className="card card-border bg-base-100 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="size-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-base-content">Kamus jawaban</h2>
            <p className="text-xs text-base-content/60">
              Kelola frasa yang dilarang atau wajib disertakan dalam jawaban.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-base-content/70">
              Frasa terlarang
            </label>
            <textarea
              value={forbiddenWordsText}
              onChange={(event) => setForbiddenWordsText(event.target.value)}
              rows={8}
              placeholder={'internal secret\nunapproved claim'}
              className="textarea textarea-bordered w-full text-sm"
            />
            <span className="text-xs text-base-content/60">
              Satu frasa per baris. Pencocokan tidak peka huruf besar/kecil.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-base-content/70">
              Aturan frasa wajib
            </label>
            <textarea
              value={requiredWordsText}
              onChange={(event) => setRequiredWordsText(event.target.value)}
              rows={8}
              placeholder={'Contact HR | employee\nTerms and conditions apply'}
              className="textarea textarea-bordered w-full text-sm"
            />
            <span className="text-xs text-base-content/60">
              Gunakan “frasa | kondisi”. Kosongkan kondisi agar frasa wajib di setiap jawaban.
            </span>
          </div>
        </div>
      </div>

      <div className="card card-border bg-base-100 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <Search className="size-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-base-content">
              Konfigurasi pencarian
            </h2>
            <p className="text-xs text-base-content/60">
              Atur kandidat pencarian dan konteks yang dikirim ke LLM.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-base-content/70">Kandidat Top K</label>
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
              className="input input-bordered w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-base-content/70">
              Maksimal dokumen konteks
            </label>
            <input
              type="number"
              min={1}
              max={Math.min(20, retrievalTopK)}
              value={maxContextDocuments}
              onChange={(event) => setMaxContextDocuments(Number(event.target.value))}
              className="input input-bordered w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-base-content/70">
              Ambang kemiripan: {similarityThreshold.toFixed(2)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={similarityThreshold}
              onChange={(event) => setSimilarityThreshold(Number(event.target.value))}
              className="range range-primary range-sm"
            />
            <p className="text-xs text-base-content/60">
              Berlaku untuk jalur semantik; istilah persis tetap dapat ditemukan oleh full-text.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-base-content/70">Prioritas sumber</label>
            <select
              value={sourcePriority}
              onChange={(event) =>
                setSourcePriority(event.target.value as ConfigData['retrieval']['sourcePriority'])
              }
              className="select select-bordered w-full text-sm"
            >
              <option value="balanced">Seimbang berdasarkan relevansi</option>
              <option value="faq_first">FAQ terlebih dahulu</option>
              <option value="sop_first">SOP terlebih dahulu</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-base-content/70">Aturan pemilihan</label>
            <select
              value={selectionRule}
              onChange={(event) =>
                setSelectionRule(event.target.value as ConfigData['retrieval']['selectionRule'])
              }
              className="select select-bordered w-full text-sm"
            >
              <option value="highest_score">Skor tertinggi</option>
              <option value="diverse_sources">Selang-seling FAQ dan SOP</option>
            </select>
            <p className="text-xs text-base-content/60">
              Pemilihan dijalankan setelah autentikasi dan filter akses dokumen.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-base-200">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving || resetting}
          className="text-error hover:bg-error/10 hover:border-error"
        >
          {resetting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Menghapus…
            </>
          ) : (
            <>
              <RotateCcw className="size-4" />
              Hapus konfigurasi tersimpan
            </>
          )}
        </Button>
        <Button
          variant="default"
          onClick={handleSave}
          disabled={saving || resetting}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Menyimpan…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Simpan konfigurasi
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

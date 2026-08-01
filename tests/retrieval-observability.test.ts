import { describe, expect, it, vi } from 'vitest';

import { retrieveWithDiagnostics } from '@/lib/retrieval-observability';

const options = {
  maxSources: 5,
  minScore: 0.5,
  authenticated: false,
  sourcePriority: 'balanced' as const,
  selectionRule: 'highest_score' as const,
  maxContextDocuments: 5,
};

function clock(...values: number[]) {
  const next = vi.fn();
  for (const value of values) next.mockReturnValueOnce(value);
  return next;
}

describe('retrieval observability', () => {
  it('records a successful standalone lookup without query or document content', async () => {
    const log = vi.fn();
    const retrieve = vi.fn().mockResolvedValue({
      sources: [{
        id: 'sensitive-document-id',
        type: 'faq',
        title: 'Sensitive title',
        content: 'Sensitive document content',
        score: 0.91234,
      }],
      loginRequired: false,
    });

    await retrieveWithDiagnostics({
      standaloneQuery: 'Sensitive user question',
      options,
      retrieve,
      requestId: 'request-1',
      now: clock(10, 20, 30, 35),
      log,
    });

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      event: 'chat.retrieval',
      requestId: 'request-1',
      outcome: 'sources',
      selectedMode: 'standalone',
      fallbackReason: null,
      attempts: [{
        mode: 'standalone',
        durationMs: 10,
        candidateCount: 1,
        sourceCount: 1,
        faqCount: 1,
        sopCount: 0,
        topScore: 0.91,
        loginRequired: false,
      }],
    }));
    const serialized = JSON.stringify(log.mock.calls);
    expect(serialized).not.toContain('Sensitive user question');
    expect(serialized).not.toContain('Sensitive document content');
    expect(serialized).not.toContain('sensitive-document-id');
  });

  it('records contextual fallback and its reason as two attempts', async () => {
    const log = vi.fn();
    const retrieve = vi.fn()
      .mockResolvedValueOnce({ sources: [], loginRequired: false })
      .mockResolvedValueOnce({
        sources: [{
          id: 'sop-id',
          type: 'sop',
          title: 'SOP',
          content: 'Knowledge',
          score: 0.83,
        }],
        loginRequired: false,
      });

    const result = await retrieveWithDiagnostics({
      standaloneQuery: 'Berapa lama?',
      contextualQuery: () => 'Konteks cuti. Berapa lama?',
      options,
      retrieve,
      requestId: 'request-2',
      now: clock(0, 5, 8, 10, 16, 20),
      log,
    });

    expect(result.sources[0]?.type).toBe('sop');
    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'sources',
      selectedMode: 'contextual',
      fallbackReason: 'standalone_no_accessible_sources',
      attempts: [
        expect.objectContaining({ mode: 'standalone', sourceCount: 0 }),
        expect.objectContaining({ mode: 'contextual', sopCount: 1 }),
      ],
    }));
  });

  it('does not run contextual retrieval after a restricted standalone match', async () => {
    const log = vi.fn();
    const contextualQuery = vi.fn(() => 'must not run');
    const retrieve = vi.fn().mockResolvedValue({
      sources: [],
      loginRequired: true,
    });

    await retrieveWithDiagnostics({
      standaloneQuery: 'SOP internal',
      contextualQuery,
      options,
      retrieve,
      requestId: 'request-3',
      now: clock(0, 2, 4, 5),
      log,
    });

    expect(contextualQuery).not.toHaveBeenCalled();
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'login_required',
      selectedMode: 'standalone',
    }));
  });

  it('records a safe failure without exception details', async () => {
    const log = vi.fn();
    const retrieve = vi.fn().mockRejectedValue(
      new Error('database password secret-password and private query')
    );

    await expect(retrieveWithDiagnostics({
      standaloneQuery: 'private query',
      options,
      retrieve,
      requestId: 'request-4',
      now: clock(0, 4, 6),
      log,
    })).rejects.toThrow('database password');

    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'error',
      selectedMode: null,
      failureStage: 'standalone',
    }));
    const serialized = JSON.stringify(log.mock.calls);
    expect(serialized).not.toContain('secret-password');
    expect(serialized).not.toContain('private query');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAiConfig: vi.fn(),
  streamChatCompletion: vi.fn(),
}));

vi.mock('@/lib/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/config')>();
  return {
    ...original,
    getAiConfig: mocks.getAiConfig,
  };
});

vi.mock('@/lib/llm', () => ({
  streamChatCompletion: mocks.streamChatCompletion,
}));

import {
  buildSystemPrompt,
  ragStreamFromSources,
  type RagSource,
} from '@/lib/rag';

const source: RagSource = {
  id: 'source-1',
  title: 'Refund SOP',
  content: 'Refunds require manager approval.',
  type: 'sop',
  score: 0.9,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAiConfig.mockResolvedValue({
    aiPersona: 'You are the Acme operations assistant.',
    aiTone: 'friendly',
    aiDetailLevel: 'detailed',
    aiLanguage: 'id',
    aiUseEmoji: true,
  });
  mocks.streamChatCompletion.mockImplementation(async function* () {
    yield { content: 'ok' };
  });
});

describe('AI behaviour system prompt', () => {
  it('maps every configured behaviour field into explicit prompt instructions', () => {
    const prompt = buildSystemPrompt([source], {
      aiPersona: 'You are the Acme operations assistant.',
      aiTone: 'formal',
      aiDetailLevel: 'concise',
      aiLanguage: 'en',
      aiUseEmoji: false,
    });

    expect(prompt).toContain('You are the Acme operations assistant.');
    expect(prompt).toContain('Use a formal tone.');
    expect(prompt).toContain('Keep the answer concise and focused.');
    expect(prompt).toContain('Respond in English.');
    expect(prompt).toContain('Do not use emoji.');
    expect(prompt).toContain('Refunds require manager approval.');
  });

  it('loads current behaviour for every generated answer', async () => {
    const chunks = [];
    for await (const chunk of ragStreamFromSources('Bagaimana refund?', [source])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ content: 'ok' }]);
    expect(mocks.getAiConfig).toHaveBeenCalledOnce();
    const [messages] = mocks.streamChatCompletion.mock.calls[0];
    expect(messages[0]).toMatchObject({ role: 'system' });
    expect(messages[0].content).toContain('You are the Acme operations assistant.');
    expect(messages[0].content).toContain('Use a friendly and approachable tone.');
    expect(messages[0].content).toContain('Provide a detailed answer');
    expect(messages[0].content).toContain('Respond in Indonesian.');
    expect(messages[0].content).toContain('Use emoji naturally');
  });

  it('places trusted conversation history before the latest user question', async () => {
    const history = [
      { role: 'user' as const, content: 'Bagaimana prosedur refund?' },
      { role: 'assistant' as const, content: 'Refund memerlukan persetujuan manajer.' },
    ];

    for await (const chunk of ragStreamFromSources(
      'Berapa lama prosesnya?',
      [source],
      history
    )) {
      // Consume the stream so the mocked completion is invoked.
      void chunk;
    }

    const [messages] = mocks.streamChatCompletion.mock.calls[0];
    expect(messages).toEqual([
      expect.objectContaining({ role: 'system' }),
      ...history,
      { role: 'user', content: 'Berapa lama prosesnya?' },
    ]);
  });

  it('applies configurable grounding rules without making access control optional', () => {
    const strict = buildSystemPrompt([source], {
      responseKnowledgeOnly: true,
      responseNoHallucination: true,
    });
    expect(strict).toContain('Answer only from the supplied knowledge base context.');
    expect(strict).toContain('Do not invent, infer, or add claims');

    const relaxed = buildSystemPrompt([source], {
      responseKnowledgeOnly: false,
      responseNoHallucination: false,
    });
    expect(relaxed).toContain('Prioritize the supplied knowledge base context');
    expect(relaxed).toContain('Clearly distinguish supplied knowledge');
    expect(relaxed).toContain('Never reveal or infer documents that were not supplied');
    expect(relaxed).toContain('never disclose protected SOP content');
  });

  it('includes response dictionary rules in the system prompt', () => {
    const prompt = buildSystemPrompt([source], {
      responseForbiddenWords: ['internal secret'],
      responseRequiredWords: [{ phrase: 'Contact HR', condition: 'employee' }],
    });

    expect(prompt).toContain('Never output any of these forbidden phrases');
    expect(prompt).toContain('"internal secret"');
    expect(prompt).toContain('Required phrase rules');
    expect(prompt).toContain('"Contact HR"');
    expect(prompt).toContain('"employee"');
  });
});

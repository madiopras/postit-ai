import { describe, expect, it } from 'vitest';
import { parseSseStream } from '@/lib/sse';

/**
 * Guards the phase-2 bug: the chat client split each network chunk on newlines
 * with no buffering and dropped every `event:` line, so the terminal `done`
 * frame carrying `sources` was never seen and citations never rendered.
 */

/** Feed a body in arbitrary slices to prove frames survive chunk boundaries. */
function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const frames = [];
  for await (const frame of parseSseStream(stream)) frames.push(frame);
  return frames;
}

describe('parseSseStream', () => {
  it('reads the event name, not just the data line', async () => {
    const frames = await collect(streamOf('event: done\ndata: {"ok":true}\n\n'));

    expect(frames).toEqual([{ event: 'done', data: '{"ok":true}' }]);
  });

  it('defaults to "message" when no event line is present', async () => {
    const frames = await collect(streamOf('data: {"content":"hi"}\n\n'));

    expect(frames[0].event).toBe('message');
  });

  it('reassembles a frame split across chunk boundaries', async () => {
    // The exact failure mode of the old parser: a frame arriving in pieces.
    const frames = await collect(
      streamOf('event: do', 'ne\ndata: {"cha', 'tId":"abc"}', '\n\n')
    );

    expect(frames).toEqual([{ event: 'done', data: '{"chatId":"abc"}' }]);
  });

  it('keeps multiple frames in one chunk separate', async () => {
    const frames = await collect(
      streamOf('event: status\ndata: {"type":"embedding"}\n\ndata: {"content":"A"}\n\n')
    );

    expect(frames).toHaveLength(2);
    expect(frames[0].event).toBe('status');
    expect(frames[1].event).toBe('message');
  });

  it('emits a trailing frame that never got its blank line', async () => {
    const frames = await collect(streamOf('data: {"content":"tail"}'));

    expect(frames).toHaveLength(1);
    expect(frames[0].data).toBe('{"content":"tail"}');
  });

  it('handles CRLF line endings', async () => {
    const frames = await collect(streamOf('event: done\r\ndata: {"ok":1}\r\n\r\n'));

    expect(frames).toEqual([{ event: 'done', data: '{"ok":1}' }]);
  });

  it('ignores comment/keep-alive lines', async () => {
    const frames = await collect(streamOf(': keep-alive\ndata: {"content":"x"}\n\n'));

    expect(frames).toHaveLength(1);
    expect(frames[0].data).toBe('{"content":"x"}');
  });

  it('joins multi-line data as the spec requires', async () => {
    const frames = await collect(streamOf('data: line one\ndata: line two\n\n'));

    expect(frames[0].data).toBe('line one\nline two');
  });
});

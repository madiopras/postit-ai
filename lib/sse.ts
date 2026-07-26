/**
 * Minimal SSE frame parser for `fetch`-based streaming.
 *
 * The browser's EventSource cannot be used here because the chat endpoint is a
 * POST. Parsing the body by hand is therefore unavoidable — but it has to be
 * done properly: a network chunk is not a frame. Reads split mid-frame, so
 * bytes must be buffered until a blank line marks a frame boundary, and the
 * `event:` line has to be read rather than discarded.
 */

export interface SseFrame {
  /** Value of the `event:` line, or 'message' when absent (per the SSE spec). */
  event: string;
  /** Joined `data:` lines. */
  data: string;
}

/**
 * Consume a byte stream and yield complete SSE frames.
 */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Flush a trailing frame that arrived without its blank line.
        const frame = parseFrame(buffer);
        if (frame) yield frame;
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line. Normalise CRLF first so servers
      // that use it are handled the same way.
      buffer = buffer.replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const frame = parseFrame(raw);
        if (frame) yield frame;

        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(raw: string): SseFrame | null {
  if (!raw.trim()) return null;

  let event = 'message';
  const dataLines: string[] = [];

  for (const line of raw.split('\n')) {
    if (line.startsWith(':')) continue; // comment / keep-alive
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

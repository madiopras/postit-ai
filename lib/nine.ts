const BASE = process.env.NINE_BASE || 'http://localhost:20128/v1';
const KEY = process.env.NINE_KEY || '';

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: 'openrouter/openai/text-embedding-3-small',
      input: text,
    }),
  });
  if (!res.ok) throw new Error(`embed failed: ${res.status}`);
  const json = await res.json();
  return json.data[0].embedding;
}

export async function llm(messages: { role: string; content: string }[], stream = false) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: 'dios-escampur',
      messages,
      stream,
    }),
  });
  if (!res.ok) throw new Error(`llm failed: ${res.status}`);
  return res;
}
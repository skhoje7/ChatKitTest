import { NextRequest, NextResponse } from 'next/server';

const CHATKIT_ENDPOINT = 'https://api.openai.com/v1/chatkit/sessions';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  let refreshToken: string | undefined;

  try {
    const body = await request.json();
    refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token : undefined;
  } catch (error) {
    // ignore malformed payloads and fall back to a new session
  }

  const payload: Record<string, unknown> = {
    model: 'gpt-4.1-mini',
    instructions:
      'You are an upbeat product specialist embedded on a marketing site. Provide succinct answers and highlight key capabilities of ChatKit.',
  };

  if (refreshToken) {
    payload.refresh_token = refreshToken;
  }

  const response = await fetch(CHATKIT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Beta': 'chatkit_beta=v1',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: `Failed to create ChatKit session: ${text}` },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

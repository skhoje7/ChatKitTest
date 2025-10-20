import { NextRequest, NextResponse } from 'next/server';

const CHATKIT_ENDPOINT = 'https://api.openai.com/v1/chatkit/sessions';

type SessionRequestBody = {
  refresh_token?: unknown;
  apiKey?: unknown;
  workflowId?: unknown;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as SessionRequestBody | null;

  const localApiKey =
    typeof body?.apiKey === 'string' && process.env.NODE_ENV !== 'production'
      ? body.apiKey
      : undefined;
  const apiKey = process.env.OPENAI_API_KEY ?? localApiKey;

  const workflowIdFromEnv = process.env.CHATKIT_WORKFLOW_ID;
  const workflowIdOverride =
    typeof body?.workflowId === 'string' && body.workflowId.trim() !== ''
      ? body.workflowId
      : undefined;
  const workflowId = workflowIdOverride ?? workflowIdFromEnv;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'OPENAI_API_KEY is not configured. Supply it in .env.local or paste it into the local developer settings.',
      },
      { status: 500 },
    );
  }

  const refreshToken =
    typeof body?.refresh_token === 'string' && body.refresh_token.trim() !== ''
      ? body.refresh_token
      : undefined;

  const payload: Record<string, unknown> = {
    model: 'gpt-4.1-mini',
    instructions:
      'You are an upbeat product specialist embedded on a marketing site. Provide succinct answers and highlight key capabilities of ChatKit.',
  };

  if (workflowId) {
    payload.workflow = workflowId;
  }

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

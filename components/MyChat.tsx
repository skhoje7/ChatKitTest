'use client';

import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { useMemo, useState } from 'react';
import styles from './MyChat.module.css';

type ClientSecretResponse =
  | { client_secret: string }
  | { client_secret: { value: string } }
  | { error: string };

export default function MyChat() {
  const [error, setError] = useState<string | null>(null);
  const { control } = useChatKit({
    api: {
      async getClientSecret(existing) {
        try {
          const response = await fetch('/api/chatkit/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: existing?.refresh_token }),
          });

          const payload = (await response.json().catch(() => null)) as
            | ClientSecretResponse
            | null;

          if (!response.ok || !payload || 'error' in payload) {
            const message =
              (payload && 'error' in payload && payload.error) ||
              `Unable to create a ChatKit session (status ${response.status}).`;
            throw new Error(message);
          }

          const secret =
            typeof payload.client_secret === 'string'
              ? payload.client_secret
              : payload.client_secret?.value;

          if (!secret) {
            throw new Error('ChatKit session response did not include a client secret.');
          }

          setError(null);
          return secret;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Unexpected error creating session.';
          setError(message);
          throw err;
        }
      },
    },
  });

  const content = useMemo(() => {
    if (error) {
      return (
        <div className={styles.error} role="alert">
          <h2>We couldn&apos;t start the chat</h2>
          <p>{error}</p>
          <p>
            Confirm that your deployment defines an <code>OPENAI_API_KEY</code> environment
            variable in Vercel.
          </p>
        </div>
      );
    }

    return <ChatKit control={control} className={styles.widget} />;
  }, [control, error]);

  return <div className={styles.container}>{content}</div>;
}

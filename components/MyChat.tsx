'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import styles from './MyChat.module.css';
import { loadChatKit } from '../lib/chatkit';

type ClientSecretResponse =
  | { client_secret: string }
  | { client_secret: { value: string } }
  | { error: string };

async function requestClientSecret() {
  const response = await fetch('/api/chatkit/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

  return secret;
}

export default function MyChat() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chatInstance = useRef<{ destroy?: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function mountChat() {
      try {
        setIsLoading(true);
        const [chatKit, clientSecret] = await Promise.all([
          loadChatKit(),
          requestClientSecret(),
        ]);

        if (isCancelled || !containerRef.current) {
          return;
        }

        const instance = await chatKit.mount({
          element: containerRef.current,
          client: { clientSecret },
          ui: {
            layout: 'embedded',
            theme: 'dark',
            assistantName: 'ChatKit Guide',
          },
        });

        if (isCancelled) {
          instance?.destroy?.();
          return;
        }

        chatInstance.current = instance;
        setError(null);
      } catch (err) {
        if (isCancelled) {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Unexpected error mounting ChatKit.';
        setError(message);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    mountChat();

    return () => {
      isCancelled = true;
      chatInstance.current?.destroy?.();
      chatInstance.current = null;
    };
  }, []);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error} role="alert">
          <h2>We couldn&apos;t start the chat</h2>
          <p>{error}</p>
          <p>
            Confirm that your deployment defines an <code>OPENAI_API_KEY</code> environment
            variable in Vercel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <div
          ref={containerRef}
          className={clsx(styles.widget, isLoading && styles.hidden)}
          aria-hidden={isLoading}
        />
        {isLoading && (
          <div className={styles.loading} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <span>Preparing your ChatKit session…</span>
          </div>
        )}
      </div>
    </div>
  );
}

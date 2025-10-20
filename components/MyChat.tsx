'use client';

import clsx from 'clsx';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import styles from './MyChat.module.css';
import { loadChatKit } from '../lib/chatkit';

type ClientSecretResponse =
  | { client_secret: string }
  | { client_secret: { value: string } }
  | { error: string };

type DeveloperConfig = {
  apiKey: string;
  workflowId?: string;
};

const DEV_CONFIG_STORAGE_KEY = 'chatkit.devConfig';

async function requestClientSecret(overrides?: DeveloperConfig | null) {
  const response = await fetch('/api/chatkit/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...(overrides?.apiKey ? { apiKey: overrides.apiKey } : {}),
      ...(overrides?.workflowId ? { workflowId: overrides.workflowId } : {}),
    }),
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
  const [developerConfig, setDeveloperConfig] = useState<DeveloperConfig | null>(null);
  const [hasLoadedConfig, setHasLoadedConfig] = useState(false);
  const [developerInputs, setDeveloperInputs] = useState<{ apiKey: string; workflowId: string }>(
    { apiKey: '', workflowId: '' },
  );
  const [configError, setConfigError] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(DEV_CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DeveloperConfig | null;
        if (parsed && typeof parsed.apiKey === 'string') {
          setDeveloperConfig({
            apiKey: parsed.apiKey,
            workflowId: parsed.workflowId || undefined,
          });
          setDeveloperInputs({
            apiKey: parsed.apiKey,
            workflowId: parsed.workflowId ?? '',
          });
        } else {
          setDeveloperConfig(null);
        }
      } else {
        setDeveloperConfig(null);
      }
    } catch {
      // If localStorage is unavailable or parsing fails, fall back to env vars only.
      setDeveloperConfig(null);
    } finally {
      setHasLoadedConfig(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedConfig) {
      return;
    }

    let isCancelled = false;

    async function mountChat() {
      try {
        setIsLoading(true);
        setError(null);
        const [chatKit, clientSecret] = await Promise.all([
          loadChatKit(),
          requestClientSecret(developerConfig),
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
  }, [developerConfig, hasLoadedConfig]);

  function handleConfigChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setDeveloperInputs((previous) => ({ ...previous, [name]: value }));
    setConfigError(null);
  }

  function persistDeveloperConfig(config: DeveloperConfig | null) {
    if (typeof window === 'undefined') {
      return;
    }

    if (config) {
      window.localStorage.setItem(DEV_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } else {
      window.localStorage.removeItem(DEV_CONFIG_STORAGE_KEY);
    }
  }

  function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfigError(null);

    const apiKey = developerInputs.apiKey.trim();
    const workflowId = developerInputs.workflowId.trim();

    if (!apiKey) {
      setConfigError('Enter an OpenAI API key to use for local development.');
      return;
    }

    const nextConfig: DeveloperConfig = {
      apiKey,
      ...(workflowId ? { workflowId } : {}),
    };

    setIsSavingConfig(true);
    try {
      persistDeveloperConfig(nextConfig);
      setDeveloperInputs({ apiKey, workflowId });
      // trigger a remount with the new credentials
      setDeveloperConfig({ ...nextConfig });
      setError(null);
    } catch {
      setConfigError('We could not store the key in localStorage.');
    } finally {
      setIsSavingConfig(false);
    }
  }

  function handleClearConfig() {
    setDeveloperInputs({ apiKey: '', workflowId: '' });
    try {
      persistDeveloperConfig(null);
    } catch {
      // ignore clearing failures; this only affects local caching
    }
    setDeveloperConfig(null);
    setError(null);
  }

  const missingApiKey =
    !!error && error.toLowerCase().includes('openai_api_key is not configured');

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error} role="alert">
          <h2>We couldn&apos;t start the chat</h2>
          <p>{error}</p>
          {missingApiKey ? (
            <>
              <p>
                For local runs, either create an <code>.env.local</code> file with an
                <code>OPENAI_API_KEY</code> entry or paste a key below. The value is stored only in your
                browser&apos;s <code>localStorage</code>.
              </p>
              <form className={styles.devForm} onSubmit={handleSaveConfig}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="chatkit-api-key">
                    OpenAI API key
                  </label>
                  <input
                    id="chatkit-api-key"
                    name="apiKey"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={developerInputs.apiKey}
                    onChange={handleConfigChange}
                    className={styles.input}
                    placeholder="sk-..."
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="chatkit-workflow-id">
                    Workflow ID <span className={styles.optional}>(optional)</span>
                  </label>
                  <input
                    id="chatkit-workflow-id"
                    name="workflowId"
                    type="text"
                    value={developerInputs.workflowId}
                    onChange={handleConfigChange}
                    className={styles.input}
                    placeholder="wf_..."
                  />
                </div>
                {configError && <p className={styles.configError}>{configError}</p>}
                <div className={styles.actions}>
                  <button className={styles.primaryButton} type="submit" disabled={isSavingConfig}>
                    {isSavingConfig ? 'Saving…' : 'Save & retry'}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={handleClearConfig}
                  >
                    Clear saved key
                  </button>
                </div>
              </form>
            </>
          ) : (
            <p>
              Double-check your network connection and make sure the ChatKit API is reachable from your
              local environment.
            </p>
          )}
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

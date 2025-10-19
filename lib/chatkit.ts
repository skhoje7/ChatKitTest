const CHATKIT_SCRIPT_URL = 'https://cdn.openai.com/chatkit/ui/latest/chatkit.js';

export interface ChatKitInstance {
  destroy?: () => void;
}

export interface ChatKitMountOptions {
  element: HTMLElement;
  client: {
    clientSecret: string;
  };
  ui?: {
    layout?: 'embedded' | 'overlay';
    theme?: 'light' | 'dark';
    assistantName?: string;
  };
}

export interface ChatKitGlobal {
  mount: (options: ChatKitMountOptions) => Promise<ChatKitInstance>;
}

declare global {
  interface Window {
    ChatKit?: ChatKitGlobal;
  }
}

let chatKitPromise: Promise<ChatKitGlobal> | null = null;

export async function loadChatKit(): Promise<ChatKitGlobal> {
  if (typeof window === 'undefined') {
    throw new Error('ChatKit can only be loaded in a browser environment.');
  }

  if (window.ChatKit) {
    return window.ChatKit;
  }

  if (!chatKitPromise) {
    chatKitPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${CHATKIT_SCRIPT_URL}"]`,
      );

      if (existing) {
        if (existing.dataset.loaded === 'true' && window.ChatKit) {
          resolve(window.ChatKit);
          return;
        }

        existing.addEventListener('load', () => {
          existing.dataset.loaded = 'true';
          if (window.ChatKit) {
            resolve(window.ChatKit);
          } else {
            chatKitPromise = null;
            reject(new Error('ChatKit script loaded but did not initialize.'));
          }
        });
        existing.addEventListener('error', () => {
          chatKitPromise = null;
          reject(new Error('Failed to load ChatKit assets.'));
        });
        return;
      }

      const script = document.createElement('script');
      script.src = CHATKIT_SCRIPT_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        script.dataset.loaded = 'true';
        if (window.ChatKit) {
          resolve(window.ChatKit);
        } else {
          chatKitPromise = null;
          reject(new Error('ChatKit script loaded but did not initialize.'));
        }
      };

      script.onerror = () => {
        chatKitPromise = null;
        reject(new Error('Failed to load ChatKit assets.'));
      };

      document.head.appendChild(script);
    });
  }

  return chatKitPromise;
}

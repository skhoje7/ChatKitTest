import Image from 'next/image';
import styles from './page.module.css';
import dynamic from 'next/dynamic';

const ChatPanel = dynamic(() => import('../components/MyChat'), { ssr: false });

export default function Home() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <Image
            src="/chatkit.svg"
            alt="ChatKit"
            width={64}
            height={64}
            priority
          />
          <h1>Chat with your product using ChatKit</h1>
          <p>
            This demo shows how to request a client secret from a Next.js API route
            and render the official ChatKit widget inside a React component. Deploy
            the project on Vercel with your <code>OPENAI_API_KEY</code> to start a
            conversation.
          </p>
        </div>
        <ChatPanel />
      </section>
    </main>
  );
}

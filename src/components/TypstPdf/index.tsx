import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useEffect, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import styles from './styles.module.css';

interface Props {
  id: string;
  title: string;
  variant?: 'enonce' | 'corrige' | 'presentation';
  correction?: boolean;
}

export default function TypstPdf({ id, title, variant = 'presentation', correction = false }: Props): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();
  const iframe = useRef<HTMLIFrameElement>(null);
  const base = String(siteConfig.customFields.exercicesWebUrl).replace(/\/$/, '');
  const selected = correction && new URLSearchParams(location.search).get('cor') === '1' ? 'corrige' : variant;
  const query = new URLSearchParams({ vue: selected, cor: correction ? '1' : '0' });
  const url = `${base}/apercu/${encodeURIComponent(id)}/?${query}`;

  useEffect(() => {
    const origin = new URL(base).origin;
    const sendTheme = () => iframe.current?.contentWindow?.postMessage({ type: 'exercices:theme', theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light' }, origin);
    const ready = (event: MessageEvent) => {
      if (event.origin === origin && event.source === iframe.current?.contentWindow && event.data?.type === 'exercices:ready') sendTheme();
    };
    const observer = new MutationObserver(sendTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('message', ready);
    const element = iframe.current;
    element?.addEventListener('load', sendTheme);
    sendTheme();
    return () => { observer.disconnect(); window.removeEventListener('message', ready); element?.removeEventListener('load', sendTheme); };
  }, [base, url]);

  return <div className={styles.container}>
    <iframe ref={iframe} src={url} title={title} className={styles.viewer} allow="fullscreen" allowFullScreen />
  </div>;
}

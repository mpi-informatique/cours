import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useColorMode } from '@docusaurus/theme-common';
import styles from './styles.module.css';

interface Props {
  id: string;
  title: string;
  variant?: 'enonce' | 'corrige' | 'presentation';
}

export default function TypstPdf({ id, title, variant = 'enonce' }: Props): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const { colorMode } = useColorMode();
  const base = String(siteConfig.customFields.exercicesWebUrl).replace(/\/$/, '');
  const query = new URLSearchParams({ theme: colorMode, vue: variant });
  const url = `${base}/apercu/${encodeURIComponent(id)}/?${query}`;

  return <div className={styles.container}>
    <iframe src={url} title={title} className={styles.viewer} allowFullScreen />
    <a href={url} target="_blank" rel="noopener noreferrer">Ouvrir le lecteur dans un nouvel onglet</a>
  </div>;
}

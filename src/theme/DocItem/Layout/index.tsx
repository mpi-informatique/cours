import type { ReactNode } from 'react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import OriginalLayout from '@theme-original/DocItem/Layout';
import DocItemContent from '@theme/DocItem/Content';
import type { Props } from '@theme/DocItem/Layout';

export default function DocItemLayout(props: Props): ReactNode {
  const { frontMatter } = useDoc();
  if (!('typst' in frontMatter && frontMatter.typst === true)) return <OriginalLayout {...props} />;
  return <div className="typst-doc-layout"><DocItemContent>{props.children}</DocItemContent></div>;
}

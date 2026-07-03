// Renders an ordered list of SectionInstances by looking each up in the block
// registry. Wraps every block in a spaced, scroll-reveal section.

import { SectionInstance } from '../config/types';
import { getBlockDef } from './registry';

interface Props {
  sections: SectionInstance[];
  /** Render even disabled sections (used by the editor preview). */
  includeDisabled?: boolean;
}

export const SectionRenderer = ({ sections, includeDisabled = false }: Props) => {
  return (
    <>
      {sections.map((section) => {
        if (!section.enabled && !includeDisabled) return null;
        const def = getBlockDef(section.type);
        if (!def) return null;
        const Block = def.component;
        const props = { ...(def.defaultProps || {}), ...section.props };
        return (
          <section key={section.id} className="sf-reveal" style={{ marginBottom: 'var(--sf-section-space)' }}>
            <Block props={props} />
          </section>
        );
      })}
    </>
  );
};

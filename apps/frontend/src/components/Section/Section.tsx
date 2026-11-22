import { Children, useId } from 'react';
import './Section.css';

export interface SectionProps {
  title: string;
  headingLevel?: 2 | 3 | 4;
  /** Text, or a link/button the caller passes in. */
  headerAction?: React.ReactNode;
  isLoading?: boolean;
  /** Shown when there are no rows and not loading. */
  emptyMessage?: React.ReactNode;
  /** Enables body scrolling. */
  maxHeight?: number | string;
  /** SectionRow elements, rendered in the order given. */
  children?: React.ReactNode;
  className?: string;
}

const SKELETON_ROWS = 3;

export const Section: React.FC<SectionProps> = ({
  title,
  headingLevel = 2,
  headerAction,
  isLoading = false,
  emptyMessage = 'Nothing to show yet.',
  maxHeight,
  children,
  className,
}) => {
  const titleId = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const isEmpty = Children.toArray(children).length === 0;

  return (
    <section
      className={['section', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
    >
      <header className="section__header">
        <Heading id={titleId} className="section__title">
          {title}
        </Heading>
        {headerAction && <div className="section__action">{headerAction}</div>}
      </header>
      {!isLoading && isEmpty ? (
        <p className="section__empty">{emptyMessage}</p>
      ) : (
        // Explicit role: Safari drops list semantics when list-style is none.
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ul
          className="section__body"
          role="list"
          aria-busy={isLoading}
          style={maxHeight !== undefined ? { maxHeight } : undefined}
          data-scroll={maxHeight !== undefined}
        >
          {isLoading ? (
            <>
              <li className="section__sr">Loading…</li>
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <li
                  key={i}
                  className="section__skeleton"
                  data-testid="section-skeleton"
                  aria-hidden="true"
                />
              ))}
            </>
          ) : (
            children
          )}
        </ul>
      )}
    </section>
  );
};

export default Section;

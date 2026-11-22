import './Section.css';

export interface SectionRowProps {
  /** See DateTimeHeading. */
  heading: React.ReactNode;
  label?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** When set, the subtitle renders as an italic underlined link. */
  subtitleHref?: string;
  leadingIcon?: React.ReactNode;
  tag?: React.ReactNode;
  trailing?: 'chevron' | 'none';
  /** Makes the whole row a link. */
  href?: string;
  /** Makes the whole row a button. */
  onClick?: () => void;
  highlighted?: boolean;
}

const Chevron: React.FC = () => (
  <svg
    className="section-row__chevron"
    width="12"
    height="20"
    viewBox="0 0 12 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 2l8 8-8 8" />
  </svg>
);

export const SectionRow: React.FC<SectionRowProps> = ({
  heading,
  label,
  subtitle,
  subtitleHref,
  leadingIcon,
  tag,
  trailing = 'none',
  href,
  onClick,
  highlighted = false,
}) => {
  const interactive = Boolean(href || onClick);
  const subtitleIsLink = Boolean(subtitleHref && subtitle);

  const main = (
    <>
      <div className="section-row__heading">{heading}</div>
      {label && <div className="section-row__label">{label}</div>}
      {subtitle && !subtitleIsLink && (
        <div className="section-row__subtitle">{subtitle}</div>
      )}
    </>
  );

  // A <button> or <a> cannot contain another link, so the row's own element
  // wraps only the text, and its ::after stretches over the whole row. The
  // subtitle link sits outside it, above the overlay, so it stays clickable
  // and never triggers the row's action.
  let mainElement: React.ReactNode;
  if (href) {
    mainElement = (
      <a className="section-row__main section-row__main--stretch" href={href}>
        {main}
      </a>
    );
  } else if (onClick) {
    mainElement = (
      <button
        type="button"
        className="section-row__main section-row__main--stretch"
        onClick={onClick}
      >
        {main}
      </button>
    );
  } else {
    mainElement = <div className="section-row__main">{main}</div>;
  }

  return (
    <li
      className="section-row"
      data-interactive={interactive}
      data-highlighted={highlighted}
    >
      {leadingIcon && (
        <span className="section-row__leading" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <div className="section-row__text">
        {mainElement}
        {subtitleIsLink && (
          <a className="section-row__subtitle-link" href={subtitleHref}>
            {subtitle}
          </a>
        )}
      </div>
      {tag && <div className="section-row__tag">{tag}</div>}
      {trailing === 'chevron' && <Chevron />}
    </li>
  );
};

export default SectionRow;

type FigmaIconName =
  | "arrow"
  | "bold"
  | "bullet"
  | "capture"
  | "check"
  | "chevron"
  | "close"
  | "copy"
  | "file"
  | "grip"
  | "history"
  | "image"
  | "indent"
  | "italic"
  | "link"
  | "more"
  | "note"
  | "numbered"
  | "plus"
  | "search"
  | "settings"
  | "trash"
  | "underline";

const paths: Record<FigmaIconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M4 8h8M9 5l3 3-3 3" />
    </>
  ),
  bold: (
    <>
      <path d="M5 3h3.5a2.5 2.5 0 0 1 0 5H5zM5 8h4a2.5 2.5 0 0 1 0 5H5z" />
    </>
  ),
  bullet: (
    <>
      <path d="M6.5 4h6M6.5 8h6M6.5 12h6" />
      <circle cx="3" cy="4" r=".7" fill="currentColor" stroke="none" />
      <circle cx="3" cy="8" r=".7" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  capture: (
    <>
      <path d="M4 6V4h2M10 4h2v2M12 10v2h-2M6 12H4v-2" />
      <path d="M6.5 8h3" />
    </>
  ),
  check: <path d="m3.5 8 3 3 6-6" />,
  chevron: <path d="m5.5 6.5 2.5 3 2.5-3" />,
  close: <path d="m4.5 4.5 7 7m0-7-7 7" />,
  copy: (
    <>
      <rect x="5.5" y="5.5" width="7" height="7" rx="1.2" />
      <path d="M10.5 5.5v-2h-7v7h2" />
    </>
  ),
  file: (
    <>
      <path d="M4 2.5h5l3 3v8H4z" />
      <path d="M9 2.5v3h3" />
    </>
  ),
  grip: (
    <>
      <path d="M5.5 5.5h.01M10.5 5.5h.01M5.5 10.5h.01M10.5 10.5h.01" strokeWidth="2.4" />
    </>
  ),
  history: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3l2 1.5" />
    </>
  ),
  image: (
    <>
      <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
      <circle cx="6" cy="6.5" r="1" />
      <path d="m3 11 3-3 2.2 2 1.5-1.5L13 12" />
    </>
  ),
  indent: (
    <>
      <path d="M6 4h7M8 8h5M6 12h7M3 6l2 2-2 2" />
    </>
  ),
  italic: (
    <>
      <path d="M7 3h5M4 13h5M9.5 3l-3 10" />
    </>
  ),
  link: (
    <>
      <path d="M6.5 9.5 9.5 6M6.5 11H5a3 3 0 0 1 0-6h2M9.5 5H11a3 3 0 0 1 0 6H9" />
    </>
  ),
  more: (
    <>
      <circle cx="3.5" cy="8" r=".8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r=".8" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="8" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  note: (
    <>
      <path d="M3.5 2.5h9v11h-9z" />
      <path d="M6 6h4M6 8.5h4M6 11h2.5" />
    </>
  ),
  numbered: (
    <>
      <path d="M7 4h6M7 8h6M7 12h6M2.5 3.5h1v2M2.5 8h1l-1 2h1M2.5 12h1c.5 0 .5 1 0 1h-1" />
    </>
  ),
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4" />
      <path d="m10 10 3 3" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 2.5v1.2M8 12.3v1.2M2.5 8h1.2M12.3 8h1.2M4.1 4.1l.9.9M11 11l.9.9M11.9 4.1l-.9.9M5 11l-.9.9" />
    </>
  ),
  trash: (
    <>
      <path d="M3.5 5h9M6 5V3.5h4V5M5 5l.5 8h5l.5-8" />
    </>
  ),
  underline: (
    <>
      <path d="M4.5 3v4a3.5 3.5 0 0 0 7 0V3M3.5 13h9" />
    </>
  ),
};

const aliases:Partial<Record<IconName,FigmaIconName>>={x:'close',list:'bullet',number:'numbered',screen:'capture',attach:'file',layout:'settings',back:'arrow'};
export type IconName=FigmaIconName|'x'|'list'|'number'|'screen'|'attach'|'layout'|'back'|'resize';
export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {name==='resize'?<path d="m5 13 8-8M9 13l4-4"/>:paths[aliases[name]??name as FigmaIconName]}
    </svg>
  );
}

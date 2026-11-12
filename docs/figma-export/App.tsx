import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type IconName =
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

const paths: Record<IconName, React.ReactNode> = {
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

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
    </button>
  );
}

const captures = [
  {
    id: 1,
    type: "image" as IconName,
    title: "Gradient descent — lecture 7",
    excerpt:
      "The learning rate controls how far we move in the direction of the negative gradient.",
    time: "10:42 AM",
    group: "Today",
    attachment: "lecture-07.png",
  },
  {
    id: 2,
    type: "note" as IconName,
    title: "Ask in office hours",
    excerpt: "Why does momentum help when the loss surface has narrow valleys?",
    time: "9:18 AM",
    group: "Today",
  },
  {
    id: 3,
    type: "link" as IconName,
    title: "Optimization reading",
    excerpt: "Distill — Why Momentum Really Works",
    time: "Yesterday",
    group: "Yesterday",
  },
  {
    id: 4,
    type: "file" as IconName,
    title: "Problem set notes",
    excerpt: "Review question 4 before Thursday’s study group.",
    time: "4:36 PM",
    group: "Yesterday",
    attachment: "problem-set-3.pdf",
  },
];

function LectureBackdrop() {
  return (
    <div className="lecture" aria-hidden="true">
      <div className="lecture-toolbar">
        <div className="document-title">
          <span className="doc-mark" /> CS 229 · Lecture 7 — Optimization.pdf
        </div>
        <div className="pdf-controls">
          <span>–</span>
          <span>125%</span>
          <span>+</span>
          <i />
          <span>7 / 38</span>
          <i />
          <span>•••</span>
        </div>
      </div>
      <div className="pdf-stage">
        <div className="pdf-page">
          <div className="page-kicker">CS 229 · Machine Learning</div>
          <h1>
            Optimization and
            <br />
            gradient descent
          </h1>
          <div className="lecture-rule" />
          <h2>Choosing a learning rate</h2>
          <p>
            We update the parameters in the direction that most rapidly decreases the objective
            function:
          </p>
          <div className="equation">
            θ<sub>t+1</sub> = θ<sub>t</sub> − η ∇J(θ<sub>t</sub>)
          </div>
          <div className="diagram">
            <svg viewBox="0 0 500 135">
              <path d="M20 105 C90 20 145 18 210 98 S335 120 475 27" />
              <path className="axis" d="M20 116h460M30 120V20" />
              <circle cx="142" cy="39" r="6" />
              <path className="arrow-line" d="m142 39 55 43m-13-1 13 1-3-12" />
            </svg>
          </div>
          <div className="columns">
            <div>
              <b>Too small</b>
              <p>Convergence is reliable, but training can take an impractical number of steps.</p>
            </div>
            <div>
              <b>Too large</b>
              <p>Updates may overshoot the minimum or cause the loss to diverge.</p>
            </div>
          </div>
          <div className="page-number">7</div>
        </div>
      </div>
    </div>
  );
}

function CaptureBar({ onHistory, onNote }: { onHistory: () => void; onNote: () => void }) {
  const [value, setValue] = useState("");
  const [menu, setMenu] = useState(false);
  const [attachment, setAttachment] = useState("");
  const [toast, setToast] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const save = () => {
    if (!value.trim() && !attachment) return;
    setToast("Saved");
    setValue("");
    setAttachment("");
    window.setTimeout(() => setToast(""), 1800);
  };
  const keydown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      save();
    }
  };
  return (
    <div className="capture-area">
      {toast && (
        <div className="toast">
          <Icon name="check" size={14} />
          {toast}
        </div>
      )}
      <div className={`capture-window ${attachment ? "with-attachment" : ""}`}>
        <button className="drag-grip" aria-label="Move capture">
          <Icon name="grip" />
        </button>
        <IconButton
          icon="plus"
          label="Add to capture"
          active={menu}
          onClick={() => setMenu(!menu)}
        />
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={keydown}
          placeholder="Capture a thought…"
          aria-label="Capture a thought"
        />
        <button
          className="save-button"
          disabled={!value.trim() && !attachment}
          onClick={save}
          aria-label="Save capture"
        >
          <Icon name="arrow" />
        </button>
        {attachment && (
          <div className="attachment-chip">
            <Icon name="file" size={14} />
            <span>{attachment}</span>
            <button onClick={() => setAttachment("")} aria-label="Remove attachment">
              <Icon name="close" size={13} />
            </button>
          </div>
        )}
      </div>
      {menu && (
        <div className="menu capture-menu">
          <button
            onClick={() => {
              setAttachment("course-outline.pdf");
              setMenu(false);
              inputRef.current?.focus();
            }}
          >
            <Icon name="file" />
            <span>Attach file</span>
            <kbd>⌘U</kbd>
          </button>
          <button
            onClick={() => {
              setAttachment("Screenshot 10.44 AM.png");
              setMenu(false);
            }}
          >
            <Icon name="capture" />
            <span>Screenshot</span>
            <kbd>⌃⌥S</kbd>
          </button>
          <div className="menu-rule" />
          <button
            onClick={() => {
              onHistory();
              setMenu(false);
            }}
          >
            <Icon name="history" />
            <span>History</span>
            <kbd>⌃⌥H</kbd>
          </button>
          <button
            onClick={() => {
              onNote();
              setMenu(false);
            }}
          >
            <Icon name="note" />
            <span>Study note</span>
            <kbd>⇧⌘N</kbd>
          </button>
        </div>
      )}
    </div>
  );
}

function StudyNote({
  visible,
  onClose,
  onSettings,
  showFormatting,
  onToggleFormatting,
  textSize,
}: {
  visible: boolean;
  onClose: () => void;
  onSettings: () => void;
  showFormatting: boolean;
  onToggleFormatting: () => void;
  textSize: number;
}) {
  const [formatMenu, setFormatMenu] = useState(false);
  const [saved, setSaved] = useState(true);
  const [words, setWords] = useState(45);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("betterpad-note");
    if (stored && editorRef.current) editorRef.current.innerHTML = stored;
  }, [visible]);
  const update = () => {
    if (!editorRef.current) return;
    setSaved(false);
    setWords(editorRef.current.innerText.trim().split(/\s+/).filter(Boolean).length);
    const html = editorRef.current.innerHTML;
    window.setTimeout(() => {
      localStorage.setItem("betterpad-note", html);
      setSaved(true);
    }, 600);
  };
  const command = (name: string) => {
    document.execCommand(name);
    editorRef.current?.focus();
    update();
  };
  if (!visible) return null;
  return (
    <section className="floating-window study-note" aria-label="Study note">
      <header className="window-header">
        <div className="window-title">
          <Icon name="note" />
          <span>Study note</span>
        </div>
        <div className="header-actions">
          <IconButton
            icon="more"
            label="More options"
            active={formatMenu}
            onClick={() => setFormatMenu(!formatMenu)}
          />
          <IconButton icon="close" label="Close study note" onClick={onClose} />
        </div>
      </header>
      {formatMenu && (
        <div className="menu note-menu">
          <button
            onClick={() => {
              onToggleFormatting();
              setFormatMenu(false);
            }}
          >
            {showFormatting ? <Icon name="check" /> : <span />}
            <span>Show formatting bar</span>
          </button>
          <button>
            <Icon name="file" />
            <span>Export note…</span>
          </button>
          <div className="menu-rule" />
          <button
            onClick={() => {
              onSettings();
              setFormatMenu(false);
            }}
          >
            <Icon name="settings" />
            <span>Settings</span>
          </button>
        </div>
      )}
      {showFormatting && (
        <div className="format-bar">
          <button className="style-select">
            Paragraph <Icon name="chevron" size={13} />
          </button>
          <span className="bar-rule" />
          <IconButton icon="bold" label="Bold" onClick={() => command("bold")} />
          <IconButton icon="italic" label="Italic" onClick={() => command("italic")} />
          <IconButton icon="underline" label="Underline" onClick={() => command("underline")} />
          <span className="bar-rule" />
          <IconButton
            icon="bullet"
            label="Bulleted list"
            onClick={() => command("insertUnorderedList")}
          />
          <IconButton
            icon="numbered"
            label="Numbered list"
            onClick={() => command("insertOrderedList")}
          />
          <IconButton icon="indent" label="Indent" onClick={() => command("indent")} />
        </div>
      )}
      <div
        className="note-editor"
        style={{ fontSize: textSize }}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={update}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            command(e.shiftKey ? "outdent" : "indent");
          }
        }}
      >
        <h3>Optimization — lecture 7</h3>
        <div>Gradient descent moves in the direction of steepest decrease.</div>
        <br />
        <div>
          <b>Learning rate η</b>
        </div>
        <ul>
          <li>Too small → slow convergence</li>
          <li>Too large → overshooting</li>
        </ul>
        <br />
        <div>Ask: how does momentum behave in narrow valleys?</div>
      </div>
      <footer className="status-strip">
        <span className={saved ? "" : "saving-dot"}>{saved ? "Saved" : "Saving…"}</span>
        <span>{words} words</span>
      </footer>
      <span className="resize-grip" aria-hidden="true" />
    </section>
  );
}

function HistoryWindow({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(1);
  const [copied, setCopied] = useState(false);
  const results = captures.filter((item) => {
    const matchesSearch = `${item.title} ${item.excerpt} ${item.attachment || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" || (filter === "Files" ? !!item.attachment : !item.attachment);
    return matchesSearch && matchesFilter;
  });
  const current = captures.find((item) => item.id === selected) || results[0];
  return (
    <section className="floating-window history-window">
      <header className="window-header history-header">
        <div className="window-title">
          <Icon name="history" />
          <span>History</span>
        </div>
        <div className="header-actions">
          <button className="text-action">
            <Icon name="plus" size={14} /> New capture
          </button>
          <IconButton icon="close" label="Close history" onClick={onClose} />
        </div>
      </header>
      <div className="history-content">
        <aside className="history-sidebar">
          <label className="search-field">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search captures"
              autoFocus
            />
            <kbd>⌘F</kbd>
          </label>
          <div className="filters">
            {["All", "Text", "Files"].map((item) => (
              <button
                className={filter === item ? "selected" : ""}
                onClick={() => setFilter(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="capture-list">
            {results.length === 0 && (
              <div className="empty-results">
                <Icon name="search" size={20} />
                <b>No captures found</b>
                <span>Try a different search.</span>
              </div>
            )}
            {["Today", "Yesterday"].map((group) => {
              const groupItems = results.filter((item) => item.group === group);
              return (
                groupItems.length > 0 && (
                  <div key={group}>
                    <div className="group-label">{group}</div>
                    {groupItems.map((item) => (
                      <button
                        className={`history-row ${selected === item.id ? "selected" : ""}`}
                        onClick={() => setSelected(item.id)}
                        key={item.id}
                      >
                        <span className="type-icon">
                          <Icon name={item.type} />
                        </span>
                        <span className="row-copy">
                          <b>{item.title}</b>
                          <span>{item.excerpt}</span>
                          <small>
                            {item.time}
                            {item.attachment ? " · 1 attachment" : ""}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                )
              );
            })}
          </div>
        </aside>
        <article className="capture-detail">
          {current ? (
            <>
              <div className="detail-meta">
                <span>
                  {current.group === "Today"
                    ? `Today at ${current.time}`
                    : `Yesterday at ${current.time}`}
                </span>
                <div>
                  <button
                    onClick={() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    }}
                  >
                    <Icon name={copied ? "check" : "copy"} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button>
                    <Icon name="trash" />
                    Delete
                  </button>
                </div>
              </div>
              <h2>{current.title}</h2>
              <p>{current.excerpt}</p>
              {current.type === "image" && (
                <div className="image-preview">
                  <div className="mini-slide">
                    <span>CHOOSING A LEARNING RATE</span>
                    <b>
                      θ<sub>t+1</sub> = θ<sub>t</sub> − η∇J(θ<sub>t</sub>)
                    </b>
                    <i />
                  </div>
                </div>
              )}
              {current.attachment && (
                <div className="detail-file">
                  <Icon name={current.type === "image" ? "image" : "file"} />
                  <div>
                    <b>{current.attachment}</b>
                    <span>
                      {current.type === "image" ? "PNG image · 1.2 MB" : "PDF document · 842 KB"}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-results">
              <b>Select a capture</b>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function SettingsWindow({
  onClose,
  formatting,
  onFormattingChange,
  textSize,
  onTextSizeChange,
}: {
  onClose: () => void;
  formatting: boolean;
  onFormattingChange: () => void;
  textSize: number;
  onTextSizeChange: () => void;
}) {
  return (
    <section className="floating-window settings-window">
      <header className="window-header">
        <div className="window-title">
          <Icon name="settings" />
          <span>Settings</span>
        </div>
        <IconButton icon="close" label="Close settings" onClick={onClose} />
      </header>
      <div className="settings-body">
        <div className="settings-section">
          <h2>Shortcuts</h2>
          <p>Open Betterpad from anywhere.</p>
          {[
            ["Quick capture", "⌃ ⌥ Space"],
            ["Screenshot", "⌃ ⌥ S"],
            ["History", "⌃ ⌥ H"],
            ["Study note", "⇧ ⌘ N"],
          ].map(([name, keys]) => (
            <div className="setting-row" key={name}>
              <span>{name}</span>
              <kbd>{keys}</kbd>
            </div>
          ))}
        </div>
        <div className="settings-section">
          <h2>Study note</h2>
          <div className="setting-row">
            <div>
              <span>Formatting bar</span>
              <small>Show formatting controls by default</small>
            </div>
            <button
              className={`toggle ${formatting ? "on" : ""}`}
              onClick={onFormattingChange}
              aria-label="Toggle formatting bar"
              aria-pressed={formatting}
            >
              <span />
            </button>
          </div>
          <div className="setting-row">
            <span>Text size</span>
            <button className="select-control" onClick={onTextSizeChange}>
              {textSize} px
              <Icon name="chevron" size={13} />
            </button>
          </div>
        </div>
        <div className="settings-section storage">
          <h2>Data</h2>
          <div className="setting-row">
            <div>
              <span>Storage</span>
              <small>Captures are stored locally on this Mac</small>
            </div>
            <button className="secondary-button">Open folder</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [note, setNote] = useState(true);
  const [window, setWindow] = useState<"history" | "settings" | null>(null);
  const [showFormatting, setShowFormatting] = useState(true);
  const [noteTextSize, setNoteTextSize] = useState(14);

  useEffect(() => {
    const closeWindow = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setWindow(null);
    };
    globalThis.addEventListener("keydown", closeWindow);
    return () => globalThis.removeEventListener("keydown", closeWindow);
  }, []);

  return (
    <main>
      <LectureBackdrop />
      <CaptureBar onHistory={() => setWindow("history")} onNote={() => setNote(true)} />
      <StudyNote
        visible={note && !window}
        onClose={() => setNote(false)}
        onSettings={() => setWindow("settings")}
        showFormatting={showFormatting}
        onToggleFormatting={() => setShowFormatting((value) => !value)}
        textSize={noteTextSize}
      />
      {window === "history" && <HistoryWindow onClose={() => setWindow(null)} />}
      {window === "settings" && (
        <SettingsWindow
          onClose={() => setWindow(null)}
          formatting={showFormatting}
          onFormattingChange={() => setShowFormatting((value) => !value)}
          textSize={noteTextSize}
          onTextSizeChange={() => setNoteTextSize((value) => (value === 14 ? 16 : 14))}
        />
      )}
    </main>
  );
}

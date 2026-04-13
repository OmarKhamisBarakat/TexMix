import { useCallback, useEffect, useRef, useState } from "react";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";

import {
  HeadingNode,
  QuoteNode,
  $isHeadingNode,
  $createHeadingNode,
} from "@lexical/rich-text";
import {
  ListNode,
  ListItemNode,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from "@lexical/list";
import {
  TableNode,
  TableCellNode,
  TableRowNode,
  INSERT_TABLE_COMMAND,
} from "@lexical/table";
import {
  $setBlocksType,
  $patchStyleText,
  $getSelectionStyleValueForProperty,
} from "@lexical/selection";
import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HEADING,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
} from "@lexical/markdown";
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from "lexical";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Save,
  Sigma,
  Strikethrough,
  Table,
  Underline,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  EquationNode,
  EQUATION_TRANSFORMER,
  $createEquationNode,
} from "./EquationNode";
import { $convertToMarkdownString } from "@lexical/markdown";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { editorTheme } from "./theme";
import {
  PageBreakNode,
  $createPageBreakNode,
  $isPageBreakNode,
} from "./PageBreakNode";

// ---------------------------------------------------------------------------
// Markdown transformers
// ---------------------------------------------------------------------------
const MARKDOWN_TRANSFORMERS = [
  EQUATION_TRANSFORMER,
  HEADING,
  QUOTE,
  ORDERED_LIST,
  UNORDERED_LIST,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
];

// ---------------------------------------------------------------------------
// Shared style tokens
// ---------------------------------------------------------------------------
const BTN =
  "flex items-center justify-center w-7 h-7 rounded transition-colors text-gray-600 hover:bg-gray-200 hover:text-gray-900 shrink-0";
// toolbar-active is targeted by html.dark .editor-toolbar .toolbar-active in CSS
const ACTIVE = "toolbar-active bg-blue-100 text-blue-700";

function Divider() {
  // toolbar-divider is targeted by html.dark .editor-toolbar .toolbar-divider in CSS
  return <div className="toolbar-divider w-px h-5 bg-gray-300 mx-0.5 shrink-0" />;
}

// ---------------------------------------------------------------------------
// Equation insertion button with inline popover
// ---------------------------------------------------------------------------
function InsertEquationButton() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [latex, setLatex] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setLatex("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "m") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const insert = useCallback(() => {
    const trimmed = latex.trim();
    if (!trimmed) return;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertNodes([$createEquationNode(trimmed)]);
      }
    });
    setLatex("");
    setOpen(false);
  }, [editor, latex]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        title="Insert equation (Ctrl+M)"
        className={`${BTN} ${open ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          if (open) {
            setOpen(false);
            setLatex("");
          } else {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        <Sigma size={14} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 flex items-center gap-1.5 p-2
                      bg-white border border-gray-200 rounded-lg shadow-lg min-w-[260px]"
        >
          <input
            ref={inputRef}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                insert();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                setLatex("");
              }
            }}
            placeholder="LaTeX — e.g. E = mc^2"
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm font-mono
                       focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insert();
            }}
            className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm
                       font-medium transition-colors"
          >
            Insert
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insert Table button with inline popover
// ---------------------------------------------------------------------------
function InsertTableButton() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState("3");
  const [cols, setCols] = useState("3");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const insert = useCallback(() => {
    const r = parseInt(rows, 10);
    const c = parseInt(cols, 10);
    if (isNaN(r) || isNaN(c) || r < 1 || c < 1) return;
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      rows: String(r),
      columns: String(c),
      includeHeaders: false,
    });
    setOpen(false);
  }, [editor, rows, cols]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        title="Insert table"
        className={`${BTN} ${open ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <Table size={14} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 flex items-end gap-2 p-3
                      bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          <label className="flex flex-col gap-0.5 text-xs text-gray-600">
            Rows
            <input
              type="number"
              min={1}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insert();
                }
              }}
              className="w-16 border border-gray-200 rounded px-2 py-1 text-sm
                         focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-xs text-gray-600">
            Columns
            <input
              type="number"
              min={1}
              value={cols}
              onChange={(e) => setCols(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insert();
                }
              }}
              className="w-16 border border-gray-200 rounded px-2 py-1 text-sm
                         focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insert();
            }}
            className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm
                       font-medium transition-colors"
          >
            Insert
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination plugin — auto-inserts AND removes PageBreakNodes
// ---------------------------------------------------------------------------
// A4 content height: 297 mm page − 20 mm top padding − 20 mm bottom padding
// = 257 mm at 96 dpi screen resolution
const PAGE_HEIGHT_PX = Math.round(257 * (96 / 25.4)); // ≈ 972 px

function PaginationPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ tags }) => {
      // Skip updates we ourselves triggered to avoid infinite loops
      if (tags.has("pagination")) return;

      // Wait for the browser to finish painting so getBoundingClientRect
      // reflects the freshly-laid-out DOM.
      requestAnimationFrame(() => {
        const editorEl = document.querySelector(
          ".editor-input"
        ) as HTMLElement | null;
        if (!editorEl) return;

        // Keys of content nodes that need a page break inserted before them.
        const toAdd: string[] = [];
        // Keys of existing PageBreakNodes that are no longer needed.
        const toRemove: string[] = [];

        editor.getEditorState().read(() => {
          const root = $getRoot();
          const children = root.getChildren();

          // editorTop is the viewport Y of the editor's top edge.
          // Subtracting it from any child's viewport Y gives us a
          // scroll-independent offset (both move together when the user scrolls).
          const editorTop = editorEl.getBoundingClientRect().top;

          // pageStartY = viewport Y of the current page's top edge.
          let pageStartY = editorTop;

          for (const child of children) {
            const key = child.getKey();

            // ── Existing page break ──────────────────────────────────────
            if ($isPageBreakNode(child)) {
              const el = editor.getElementByKey(key);
              if (!el) continue;

              const next = child.getNextSibling();

              if (!next) {
                // Dangling break with no following content — always remove.
                toRemove.push(key);
                continue; // do NOT advance pageStartY
              }

              // A break is unnecessary if the node following it would still
              // fit on the current page WITHOUT the break.
              // "Virtual top without break" = next.top − break's own height.
              const nextEl = editor.getElementByKey(next.getKey());
              if (nextEl) {
                const breakH = el.getBoundingClientRect().height;
                const nextVirtualTop =
                  nextEl.getBoundingClientRect().top - breakH;
                const posOnPage = nextVirtualTop - pageStartY;

                if (posOnPage < PAGE_HEIGHT_PX) {
                  // Content fits — this break is premature, remove it.
                  toRemove.push(key);
                  continue; // do NOT advance pageStartY
                }
              }

              // Break is valid — the next page starts after this break.
              pageStartY = el.getBoundingClientRect().bottom;
              continue;
            }

            // ── Regular content node ─────────────────────────────────────
            const el = editor.getElementByKey(key);
            if (!el) continue;

            const childTop = el.getBoundingClientRect().top - pageStartY;

            if (childTop >= PAGE_HEIGHT_PX) {
              // This node's top exceeds the current page height — it needs a
              // page break inserted immediately before it.
              toAdd.push(key);
              // Advance the reference by one page height.
              // (The break doesn't exist in the DOM yet, so this is an
              //  approximation; the next RAF will re-measure and correct.)
              pageStartY += PAGE_HEIGHT_PX;
            }
          }
        });

        if (toAdd.length === 0 && toRemove.length === 0) return;

        editor.update(
          () => {
            // Preserve the user's cursor so typing is not interrupted.
            const prevSelection = $getSelection();
            const savedSelection = $isRangeSelection(prevSelection)
              ? prevSelection.clone()
              : null;

            // Remove stale breaks first so they don't interfere with positions.
            for (const key of toRemove) {
              $getNodeByKey(key)?.remove();
            }

            // Insert new breaks before overflowing nodes.
            for (const key of toAdd) {
              const node = $getNodeByKey(key);
              if (!node) continue;
              // Guard: don't double-insert.
              if ($isPageBreakNode(node.getPreviousSibling())) continue;
              node.insertBefore($createPageBreakNode());
            }

            // Restore cursor position.
            if (savedSelection) $setSelection(savedSelection);
          },
          { tag: "pagination" }
        );
      });
    });
  }, [editor]);

  return null;
}

// ---------------------------------------------------------------------------
// Table of Contents page — reads H1/H2/H3 headings from the live editor state
// ---------------------------------------------------------------------------
function TableOfContentsPage({ onRemove }: { onRemove: () => void }) {
  const [editor] = useLexicalComposerContext();
  const [headings, setHeadings] = useState<
    Array<{ tag: string; text: string }>
  >([]);

  useEffect(() => {
    const readHeadings = (
      state: ReturnType<typeof editor.getEditorState>
    ) => {
      state.read(() => {
        const root = $getRoot();
        const found: Array<{ tag: string; text: string }> = [];
        for (const child of root.getChildren()) {
          if ($isHeadingNode(child)) {
            found.push({ tag: child.getTag(), text: child.getTextContent() });
          }
        }
        setHeadings(found);
      });
    };

    readHeadings(editor.getEditorState());
    return editor.registerUpdateListener(({ editorState }) =>
      readHeadings(editorState)
    );
  }, [editor]);

  const indentForTag: Record<string, string> = {
    h1: "0",
    h2: "1.5em",
    h3: "3em",
  };
  const sizeForTag: Record<string, string> = {
    h1: "1.05em",
    h2: "1em",
    h3: "0.95em",
  };
  const weightForTag: Record<string, number> = {
    h1: 700,
    h2: 500,
    h3: 400,
  };

  return (
    <div className="page-break-after flex justify-center py-8 px-4">
      <div
        className="a4-page"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}
      >
        <button
          className="no-print text-sm text-red-500 hover:text-red-700 border border-red-300
                     hover:border-red-500 px-3 py-1 rounded transition-colors mb-8"
          onClick={onRemove}
        >
          Remove Table of Contents
        </button>

        <h1
          style={{
            fontSize: "1.8em",
            fontWeight: 700,
            marginBottom: "1.2em",
            borderBottom: "1px solid #d1d5db",
            paddingBottom: "0.4em",
          }}
        >
          Table of Contents
        </h1>

        {headings.length === 0 ? (
          <p style={{ color: "#9ca3af", fontStyle: "italic" }}>
            Add headings (H1, H2, H3) to your document — they will appear here
            automatically.
          </p>
        ) : (
          <div>
            {headings.map((h, i) => (
              <div
                key={i}
                style={{
                  paddingLeft: indentForTag[h.tag] ?? 0,
                  marginBottom: "0.55em",
                  fontSize: sizeForTag[h.tag] ?? "1em",
                  fontWeight: weightForTag[h.tag] ?? 400,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1em",
                }}
              >
                <span>
                  {h.text || (
                    <em style={{ color: "#9ca3af" }}>(empty heading)</em>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Font sizes (matching Word's dropdown)
// ---------------------------------------------------------------------------
const FONT_SIZES = [
  "8pt", "9pt", "10pt", "11pt", "12pt", "14pt", "16pt",
  "18pt", "20pt", "24pt", "28pt", "36pt", "48pt", "72pt",
];

// ---------------------------------------------------------------------------
// Ribbon toolbar
// ---------------------------------------------------------------------------
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [activeHeading, setActiveHeading] = useState<"h1" | "h2" | "h3" | null>(null);
  const [activeAlignment, setActiveAlignment] = useState<ElementFormatType>("left");
  const [activeList, setActiveList] = useState<"bullet" | "number" | null>(null);
  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [fontSize, setFontSize] = useState("12pt");
  const [textColor, setTextColor] = useState("#000000");
  const [savedLabel, setSavedLabel] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
        setIsUnderline(selection.hasFormat("underline"));
        setIsStrikethrough(selection.hasFormat("strikethrough"));

        const anchorNode = selection.anchor.getNode();
        const topElement =
          anchorNode.getKey() === "root"
            ? anchorNode
            : anchorNode.getTopLevelElementOrThrow();

        if ($isHeadingNode(topElement)) {
          const tag = topElement.getTag();
          setActiveHeading(
            tag === "h1" ? "h1" : tag === "h2" ? "h2" : tag === "h3" ? "h3" : null
          );
        } else {
          setActiveHeading(null);
        }

        if ($isElementNode(topElement)) {
          setActiveAlignment(topElement.getFormatType() || "left");
        }

        // Detect list type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let listType: "bullet" | "number" | null = null;
        let cur: any = anchorNode; // eslint-disable-line @typescript-eslint/no-explicit-any
        while (cur) {
          if ($isListNode(cur)) {
            listType =
              (cur as ListNode).getListType() === "bullet" ? "bullet" : "number";
            break;
          }
          cur = cur.getParent?.() ?? null;
        }
        setActiveList(listType);

        const currentFont = $getSelectionStyleValueForProperty(
          selection,
          "font-family",
          "Times New Roman"
        );
        const currentSize = $getSelectionStyleValueForProperty(
          selection,
          "font-size",
          "12pt"
        );
        const currentColor = $getSelectionStyleValueForProperty(
          selection,
          "color",
          "#000000"
        );
        if (currentFont) setFontFamily(currentFont.replace(/['"]/g, ""));
        if (currentSize) setFontSize(currentSize);
        if (currentColor) setTextColor(currentColor);
      });
    });
  }, [editor]);

  const toggleHeading = useCallback(
    (tag: "h1" | "h2" | "h3") => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const anchorNode = selection.anchor.getNode();
        const topElement =
          anchorNode.getKey() === "root"
            ? anchorNode
            : anchorNode.getTopLevelElementOrThrow();
        if ($isHeadingNode(topElement) && topElement.getTag() === tag) {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(tag));
        }
      });
    },
    [editor]
  );

  const applyFontFamily = useCallback(
    (value: string) => {
      setFontFamily(value);
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection))
          $patchStyleText(selection, { "font-family": value });
      });
    },
    [editor]
  );

  const applyFontSize = useCallback(
    (value: string) => {
      setFontSize(value);
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection))
          $patchStyleText(selection, { "font-size": value });
      });
    },
    [editor]
  );

  const applyTextColor = useCallback(
    (value: string) => {
      setTextColor(value);
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection))
          $patchStyleText(selection, { color: value });
      });
    },
    [editor]
  );

  const handleSave = useCallback(async () => {
    let markdown = "";
    editor.getEditorState().read(() => {
      markdown = $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
    });
    const path = await saveDialog({
      filters: [{ name: "Markdown", extensions: ["md"] }],
      defaultPath: "document.md",
    });
    if (!path) return;
    setSavedLabel("saving");
    await writeTextFile(path, markdown);
    setSavedLabel("saved");
    setTimeout(() => setSavedLabel("idle"), 2000);
  }, [editor]);

  return (
    <div
      className="editor-toolbar no-print sticky top-0 z-50 flex flex-row flex-wrap items-center gap-0.5
                  px-2 py-1 bg-white shadow-sm border-b border-gray-200 select-none"
    >
      {/* ── Undo / Redo ── */}
      <button
        type="button"
        title="Undo (Ctrl+Z)"
        className={BTN}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
      >
        <Undo2 size={14} />
      </button>
      <button
        type="button"
        title="Redo (Ctrl+Y)"
        className={BTN}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
      >
        <Redo2 size={14} />
      </button>

      <Divider />

      {/* ── Font family ── */}
      <select
        title="Font family"
        value={fontFamily}
        onChange={(e) => applyFontFamily(e.target.value)}
        className="h-7 rounded border border-gray-200 bg-white px-1 text-xs text-gray-700
                   focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
        style={{ maxWidth: "130px" }}
      >
        <option value="Arial">Arial</option>
        <option value="Calibri">Calibri</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Georgia">Georgia</option>
        <option value="Courier New">Courier New</option>
        <option value="monospace">Monospace</option>
      </select>

      {/* ── Font size ── */}
      <select
        title="Font size"
        value={fontSize}
        onChange={(e) => applyFontSize(e.target.value)}
        className="h-7 w-16 rounded border border-gray-200 bg-white px-1 text-xs text-gray-700
                   focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s.replace("pt", "")}
          </option>
        ))}
      </select>

      <Divider />

      {/* ── Text formatting ── */}
      <button
        type="button"
        title="Bold (Ctrl+B)"
        className={`${BTN} ${isBold ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        }}
      >
        <Bold size={14} />
      </button>
      <button
        type="button"
        title="Italic (Ctrl+I)"
        className={`${BTN} ${isItalic ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        }}
      >
        <Italic size={14} />
      </button>
      <button
        type="button"
        title="Underline (Ctrl+U)"
        className={`${BTN} ${isUnderline ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
        }}
      >
        <Underline size={14} />
      </button>
      <button
        type="button"
        title="Strikethrough"
        className={`${BTN} ${isStrikethrough ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
        }}
      >
        <Strikethrough size={14} />
      </button>

      {/* ── Text colour ── */}
      <label
        title="Text color"
        className="flex items-center justify-center w-7 h-7 rounded cursor-pointer
                   transition-colors hover:bg-gray-200"
      >
        <input
          type="color"
          value={textColor}
          onChange={(e) => applyTextColor(e.target.value)}
          className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
        />
      </label>

      <Divider />

      {/* ── Headings ── */}
      <button
        type="button"
        title="Heading 1"
        className={`${BTN} ${activeHeading === "h1" ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          toggleHeading("h1");
        }}
      >
        <Heading1 size={14} />
      </button>
      <button
        type="button"
        title="Heading 2"
        className={`${BTN} ${activeHeading === "h2" ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          toggleHeading("h2");
        }}
      >
        <Heading2 size={14} />
      </button>
      <button
        type="button"
        title="Heading 3"
        className={`${BTN} text-xs font-bold px-1 w-auto ${activeHeading === "h3" ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          toggleHeading("h3");
        }}
      >
        H3
      </button>

      <Divider />

      {/* ── Alignment ── */}
      <button
        type="button"
        title="Align left"
        className={`${BTN} ${activeAlignment === "left" || activeAlignment === "" ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left");
        }}
      >
        <AlignLeft size={14} />
      </button>
      <button
        type="button"
        title="Align center"
        className={`${BTN} ${activeAlignment === "center" ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center");
        }}
      >
        <AlignCenter size={14} />
      </button>
      <button
        type="button"
        title="Align right"
        className={`${BTN} ${activeAlignment === "right" ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right");
        }}
      >
        <AlignRight size={14} />
      </button>

      <Divider />

      {/* ── Lists ── */}
      <button
        type="button"
        title="Bullet list"
        className={`${BTN} ${activeList === "bullet" ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          if (activeList === "bullet")
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
          else editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        }}
      >
        <List size={14} />
      </button>
      <button
        type="button"
        title="Numbered list"
        className={`${BTN} ${activeList === "number" ? ACTIVE : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          if (activeList === "number")
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
          else editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        }}
      >
        <ListOrdered size={14} />
      </button>

      <Divider />

      {/* ── Insert helpers ── */}
      <InsertEquationButton />
      <InsertTableButton />

      <Divider />

      {/* ── Save ── */}
      <button
        type="button"
        title="Save as Markdown (Ctrl+S)"
        className={BTN}
        onClick={handleSave}
      >
        <Save size={14} />
      </button>
      {savedLabel === "saved" && (
        <span className="text-xs text-green-600 ml-1">Saved</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor config
// ---------------------------------------------------------------------------
const initialConfig = {
  namespace: "TexMixEditor",
  theme: editorTheme,
  nodes: [
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    TableNode,
    TableCellNode,
    TableRowNode,
    EquationNode,
    PageBreakNode,
  ],
  onError: (error: Error) => {
    throw error;
  },
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export default function Editor({
  showTOC = false,
  onRemoveTOC,
}: {
  showTOC?: boolean;
  onRemoveTOC?: () => void;
}) {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <>
        {/* Sticky ribbon */}
        <ToolbarPlugin />

        {/* Optional Table of Contents page */}
        {showTOC && (
          <TableOfContentsPage onRemove={onRemoveTOC ?? (() => {})} />
        )}

        {/* A4 paper centred on the gray desk */}
        <div className="flex justify-center py-8 px-4">
          <div className="a4-page">
            <div className="editor-container">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    aria-placeholder="Start writing…"
                    placeholder={
                      <p className="absolute top-0 left-0 text-gray-400 pointer-events-none select-none text-sm">
                        Start writing…
                      </p>
                    }
                    className="editor-input"
                  />
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            </div>
          </div>
        </div>

        <HistoryPlugin />
        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
        <ListPlugin />
        <TablePlugin />
        <AutoFocusPlugin />
        <PaginationPlugin />
      </>
    </LexicalComposer>
  );
}

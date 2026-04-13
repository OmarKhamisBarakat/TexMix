/**
 * EquationNode — inline DecoratorNode that renders LaTeX via KaTeX.
 *
 * Lifecycle:
 *   createDOM()  → Lexical creates the host <span> in the contenteditable DOM.
 *   decorate()   → Lexical renders the returned JSX into that host span via a
 *                  React portal, completely outside the normal reconciler tree.
 *   updateDOM()  → returning `false` tells Lexical never to replace the host
 *                  span; React re-renders the portal component instead.
 *
 * isInline() = true  → the node lives inside a paragraph / heading, flowing
 *                       with surrounding text like an inline-block element.
 */

import katex from "katex";
import "katex/dist/katex.min.css";

import {
  DecoratorNode,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Klass,
  $getNodeByKey,
} from "lexical";
import type { TextMatchTransformer } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Serialized shape
// ---------------------------------------------------------------------------
export type SerializedEquationNode = SerializedLexicalNode & {
  latex: string;
};

// ---------------------------------------------------------------------------
// Decorator component
// ---------------------------------------------------------------------------
function EquationComponent({
  nodeKey,
  latex,
}: {
  nodeKey: NodeKey;
  latex: string;
}) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelected] =
    useLexicalNodeSelection(nodeKey);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(latex);

  // Render KaTeX HTML string once per latex change.
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
        output: "html",
      });
    } catch {
      return null;
    }
  }, [latex]);

  const commitEdit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== latex) {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isEquationNode(node)) {
          node.setLatex(trimmed);
        }
      });
    }
    setEditing(false);
  }, [editor, nodeKey, draft, latex]);

  // ---- edit mode: show a compact inline input ----
  if (editing) {
    return (
      <span
        className="inline-block align-middle mx-0.5"
        // Stop propagation so the editor doesn't try to handle these events.
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitEdit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setDraft(latex); // discard changes
              setEditing(false);
            }
          }}
          className="border border-blue-400 rounded px-1.5 py-0.5 text-sm font-mono bg-white
                     focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{ minWidth: "6em" }}
        />
      </span>
    );
  }

  // ---- display mode: render KaTeX output ----
  return (
    <span
      role="button"
      tabIndex={-1}
      className={[
        "inline-block align-middle mx-0.5 px-1 rounded cursor-pointer select-none",
        "transition-colors",
        isSelected
          ? "ring-2 ring-blue-400 ring-offset-1 bg-blue-50"
          : "hover:bg-gray-100",
      ].join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        clearSelected();
        setSelected(true);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(latex);
        setEditing(true);
      }}
    >
      {html ? (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        // Fallback: show raw LaTeX in red when KaTeX can't parse it.
        <code className="text-red-500 text-sm">{latex}</code>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DecoratorNode
// ---------------------------------------------------------------------------
export class EquationNode extends DecoratorNode<JSX.Element> {
  __latex: string;

  // ---- required statics ----

  static getType(): string {
    return "equation";
  }

  static clone(node: EquationNode): EquationNode {
    return new EquationNode(node.__latex, node.__key);
  }

  static importJSON(serialized: SerializedEquationNode): EquationNode {
    return $createEquationNode(serialized.latex);
  }

  // ---- construction ----

  constructor(latex: string, key?: NodeKey) {
    super(key);
    this.__latex = latex;
  }

  // ---- serialization ----

  exportJSON(): SerializedEquationNode {
    return {
      type: "equation",
      version: 1,
      latex: this.__latex,
    };
  }

  // ---- DOM contract ----

  /**
   * Creates the host element that Lexical will portal the React component into.
   * Keep it minimal — styling is handled inside EquationComponent.
   */
  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement("span");
  }

  /**
   * Return false: the host span never needs to be torn down and recreated.
   * React handles all visual updates by re-rendering the portal component.
   */
  updateDOM(): false {
    return false;
  }

  // ---- layout ----

  /**
   * `true` = node participates in inline text flow (sits inside a paragraph).
   * Set to `false` for display / block-level math.
   */
  isInline(): boolean {
    return true;
  }

  // ---- accessors ----

  getLatex(): string {
    return this.__latex;
  }

  setLatex(latex: string): this {
    // getWritable() clones the node into the active EditorState so the change
    // is recorded for undo/redo and triggers a re-render.
    const writable = this.getWritable();
    writable.__latex = latex;
    return writable;
  }

  // ---- decorator ----

  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return <EquationComponent nodeKey={this.__key} latex={this.__latex} />;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function $createEquationNode(latex: string): EquationNode {
  return new EquationNode(latex);
}

export function $isEquationNode(
  node: LexicalNode | null | undefined
): node is EquationNode {
  return node instanceof EquationNode;
}

// ---------------------------------------------------------------------------
// Markdown transformer  ($latex$ → EquationNode)
// ---------------------------------------------------------------------------
export const EQUATION_TRANSFORMER: TextMatchTransformer = {
  dependencies: [EquationNode] as Array<Klass<LexicalNode>>,

  // How to serialise an EquationNode back to markdown text.
  export: (node) => {
    if (!$isEquationNode(node)) return null;
    return `$${node.getLatex()}$`;
  },

  // Used when importing a markdown document — matches `$…$` anywhere.
  importRegExp: /\$([^$\n]+)\$/,

  // Used for live markdown shortcuts while typing — matches `$…$` at the end
  // of the current text node (just before the cursor).
  regExp: /\$([^$\n]+)\$$/,

  // Called by both the import path and the shortcut path.
  replace: (textNode, match) => {
    const [, latex] = match;
    textNode.replace($createEquationNode(latex));
  },

  // Typing a `$` is what kicks off the two-step regex evaluation above.
  trigger: "$",

  type: "text-match",
};

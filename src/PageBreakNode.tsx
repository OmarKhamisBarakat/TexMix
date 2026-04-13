/**
 * PageBreakNode — block-level DecoratorNode that creates a visual page gap.
 *
 * On screen  : renders as a 24px gray band that escapes the A4 content
 *              padding (via CSS negative margins on .page-break-wrapper),
 *              looking exactly like the gap between two sheets of paper.
 *
 * On print   : the host element carries `break-before: page` so the browser
 *              print engine starts a new physical page here.  The gray band
 *              itself collapses to height:0 so nothing visual is printed.
 */

import {
  DecoratorNode,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type SerializedLexicalNode,
} from "lexical";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Serialised shape
// ---------------------------------------------------------------------------
export type SerializedPageBreakNode = SerializedLexicalNode;

// ---------------------------------------------------------------------------
// Decorator component — the visual is entirely CSS-driven (.page-break-wrapper)
// ---------------------------------------------------------------------------
function PageBreakComponent(): JSX.Element {
  // The host div (.page-break-wrapper) already carries all the visual styling
  // through index.css.  This component just needs to return valid JSX so that
  // Lexical's decorator machinery is satisfied.
  return <span style={{ display: "none" }} aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// DecoratorNode
// ---------------------------------------------------------------------------
export class PageBreakNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return "page-break";
  }

  static clone(node: PageBreakNode): PageBreakNode {
    return new PageBreakNode(node.__key);
  }

  static importJSON(_serialized: SerializedPageBreakNode): PageBreakNode {
    return new PageBreakNode();
  }

  exportJSON(): SerializedPageBreakNode {
    return { type: "page-break", version: 1 };
  }

  /**
   * The host element carries `.page-break-wrapper`.
   * CSS in index.css does all the visual work (gray band + negative margins).
   */
  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "page-break-wrapper";
    return div;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return <PageBreakComponent />;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function $createPageBreakNode(): PageBreakNode {
  return new PageBreakNode();
}

export function $isPageBreakNode(
  node: LexicalNode | null | undefined
): node is PageBreakNode {
  return node instanceof PageBreakNode;
}

/**
 * ImageNode — block-level DecoratorNode that renders an <img> tag.
 * Supports basic drag-to-resize via a right-edge handle when selected.
 *
 * Lifecycle mirrors EquationNode:
 *   createDOM()  → Lexical creates the host <div> in the contenteditable DOM.
 *   decorate()   → Lexical portals the React component into that host div.
 *   updateDOM()  → returns false so Lexical never replaces the host element.
 *
 * isInline() = false → block-level; Lexical places it as a root child,
 *                      not inside a paragraph.
 */

import {
  DecoratorNode,
  $getNodeByKey,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import type { JSX } from "react";
import { useCallback, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Serialized shape
// ---------------------------------------------------------------------------
export type SerializedImageNode = SerializedLexicalNode & {
  src: string;
  altText: string;
  width: number | "auto";
};

// ---------------------------------------------------------------------------
// Decorator component
// ---------------------------------------------------------------------------
function ImageComponent({
  nodeKey,
  src,
  altText,
  width,
}: {
  nodeKey: NodeKey;
  src: string;
  altText: string;
  width: number | "auto";
}) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startX.current = e.clientX;
      startWidth.current = imgRef.current?.offsetWidth ?? 400;
      setIsResizing(true);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX.current;
        const newWidth = Math.max(50, startWidth.current + delta);
        if (imgRef.current) imgRef.current.style.width = `${newWidth}px`;
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        const delta = upEvent.clientX - startX.current;
        const newWidth = Math.max(50, startWidth.current + delta);
        setIsResizing(false);
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) node.setWidth(newWidth);
        });
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [editor, nodeKey]
  );

  return (
    <div
      className={[
        "relative inline-block my-2 max-w-full print:ring-0 print:ring-offset-0",
        isSelected || isResizing ? "ring-2 ring-blue-400 ring-offset-1 rounded-sm" : "",
      ].join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        clearSelected();
        setSelected(true);
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={altText}
        style={{
          width: typeof width === "number" ? `${width}px` : "auto",
          maxWidth: "100%",
          display: "block",
        }}
        draggable={false}
      />
      {(isSelected || isResizing) && (
        <div
          title="Drag to resize"
          className="no-print absolute top-1/2 right-0 -translate-y-1/2
                     w-2 h-10 bg-blue-400 rounded-sm cursor-ew-resize
                     opacity-75 hover:opacity-100 transition-opacity"
          onMouseDown={onResizeStart}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DecoratorNode
// ---------------------------------------------------------------------------
export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: number | "auto";

  // ---- required statics ----

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__width, node.__key);
  }

  static importJSON(serialized: SerializedImageNode): ImageNode {
    return new ImageNode(serialized.src, serialized.altText, serialized.width);
  }

  // ---- construction ----

  constructor(
    src: string,
    altText: string,
    width: number | "auto" = "auto",
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
  }

  // ---- serialization ----

  exportJSON(): SerializedImageNode {
    return {
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
    };
  }

  // ---- DOM contract ----

  createDOM(): HTMLElement {
    return document.createElement("div");
  }

  updateDOM(): false {
    return false;
  }

  // ---- layout ----

  isInline(): boolean {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  // ---- accessors ----

  setWidth(width: number): this {
    const writable = this.getWritable();
    writable.__width = width;
    return writable;
  }

  // ---- decorator ----

  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return (
      <ImageComponent
        nodeKey={this.__key}
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
      />
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function $createImageNode(
  src: string,
  altText = "",
  width: number | "auto" = "auto"
): ImageNode {
  return new ImageNode(src, altText, width);
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode;
}

import { useState, useEffect } from "react";
import Editor from "./Editor";
import CoverPage from "./CoverPage";
import { Moon, Sun } from "lucide-react";

function App() {
  const [showCover, setShowCover] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Apply / remove the dark class on <html> whenever darkMode changes.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Clear the window title before printing so the browser doesn't show
  // any text in the print header.  Restore it afterwards.
  useEffect(() => {
    const original = document.title;
    const hide = () => { document.title = ""; };
    const restore = () => { document.title = original; };
    window.addEventListener("beforeprint", hide);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", hide);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      {/* ── Top bar ── */}
      <div className="app-topbar no-print shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        {/* Logo */}
        <img src="/icon.png" alt="TexMix" className="h-9 w-auto" />

        <div className="flex gap-3 items-center">
          {/* Dark mode toggle */}
          <button
            className="btn-outline text-sm px-3 py-2 rounded border border-gray-300 hover:border-gray-400 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setDarkMode((v) => !v)}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            className="btn-outline text-sm px-4 py-2 rounded border border-gray-300 hover:border-gray-400 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setShowCover((v) => !v)}
          >
            {showCover ? "Remove Cover" : "Cover Page"}
          </button>
          <button
            className="btn-outline text-sm px-4 py-2 rounded border border-gray-300 hover:border-gray-400 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setShowTOC((v) => !v)}
          >
            {showTOC ? "Remove TOC" : "Table of Contents"}
          </button>
          <button
            className="btn-primary text-sm px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            onClick={() => window.print()}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Scrollable content area ── */}
      <div className="desk-area flex-1 overflow-y-auto print:overflow-visible print:flex-none">
        {showCover && <CoverPage onRemove={() => setShowCover(false)} />}
        <Editor showTOC={showTOC} onRemoveTOC={() => setShowTOC(false)} />
      </div>
    </div>
  );
}

export default App;

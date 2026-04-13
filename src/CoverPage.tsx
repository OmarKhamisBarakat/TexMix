import { useState } from "react";

interface CoverPageProps {
  onRemove: () => void;
}

export default function CoverPage({ onRemove }: CoverPageProps) {
  const [title, setTitle] = useState("Document Title");
  const [author, setAuthor] = useState("Author Name");
  const [date, setDate] = useState(new Date().toLocaleDateString());

  return (
    <div className="page-break-after">
      <div className="a4-page flex flex-col items-center justify-center text-center gap-6">
        <button
          className="no-print self-end text-sm text-red-500 hover:text-red-700 border border-red-300 hover:border-red-500 px-3 py-1 rounded transition-colors"
          onClick={onRemove}
        >
          Remove Cover Page
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
          <input
            className="text-4xl font-bold text-center w-full border-b-2 border-gray-200 focus:border-gray-400 outline-none pb-2 bg-transparent"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="text-xl text-gray-600 text-center w-full border-b border-gray-200 focus:border-gray-400 outline-none pb-1 bg-transparent"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <input
            className="text-lg text-gray-500 text-center w-64 border-b border-gray-200 focus:border-gray-400 outline-none pb-1 bg-transparent"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

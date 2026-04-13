# TexMix

A desktop word processor built with Tauri 2, React 19, and Lexical — designed to feel like Microsoft Word.

## Features

- **Rich text editing** — bold, italic, underline, strikethrough, text colour, font family & size
- **Headings** — H1, H2, H3 with Markdown shortcut support (`# `, `## `, `### `)
- **Lists** — bullet and numbered, with Markdown shortcuts (`- `, `1. `)
- **Tables** — insert with custom row/column count
- **Equations** — inline LaTeX via KaTeX (`$...$` shortcut or Ctrl+M)
- **Alignment** — left, centre, right
- **Cover page** — editable title, author, and date
- **Table of Contents** — auto-generated from H1/H2/H3 headings
- **Auto-pagination** — page breaks inserted automatically; prints as clean numbered A4 pages
- **Export PDF** — A4 output with page numbers at the bottom, no browser chrome
- **Save as Markdown** — exports the document to `.md`
- **Dark mode** — UI chrome goes dark; the document stays white
- **Undo / Redo**

## Installation

Download the latest release from the [Releases](https://github.com/OmarKhamisBarakat/TexMix/releases) page.

| File | Description |
|------|-------------|
| `texmix_x.x.x_x64-setup.exe` | NSIS installer — recommended |
| `texmix_x.x.x_x64_en-US.msi` | Windows Installer package |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri 2](https://tauri.app) |
| UI framework | [React 19](https://react.dev) |
| Language | TypeScript |
| Editor engine | [Lexical 0.43](https://lexical.dev) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Math rendering | [KaTeX](https://katex.org) |
| Icons | [Lucide React](https://lucide.dev) |

## Building from Source

**Prerequisites:** Node.js 18+, Rust stable, [Tauri system deps](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/OmarKhamisBarakat/TexMix.git
cd TexMix
npm install

# Development
npm run tauri dev

# Release build — output in src-tauri/target/release/bundle/
npm run tauri build
```

## License

MIT

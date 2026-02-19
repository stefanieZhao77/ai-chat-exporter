# AI Chat Exporter

A Chrome extension that exports AI chat conversations (ChatGPT, Gemini, Kimi, etc.) to Markdown files and syncs them directly to your Obsidian vault.

## Features

- Export chat conversations to well-structured Markdown
- Direct sync to local Obsidian folders
- Multiple trigger methods: browser icon, floating button, keyboard shortcut, context menu
- YAML frontmatter metadata
- Image download and local storage
- Customizable file naming
- Support for multiple AI platforms (ChatGPT first, more coming soon)

## Installation

(Coming soon)

## Development

```bash
# Install dependencies
npm install

# Build for development
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
ai-chat-exporter/
├── manifest.json
├── background.js
├── popup/
├── content/
├── shared/
├── options/
└── docs/
```

## Design

See [docs/plans/2026-02-19-design.md](docs/plans/2026-02-19-design.md) for detailed design documentation.

## License

MIT

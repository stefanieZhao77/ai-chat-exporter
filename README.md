# AI Chat Exporter

A Chrome extension that exports AI chat conversations (ChatGPT and Gemini) to Markdown and writes them directly to your Obsidian vault folder.

## Current Scope (v0.1.0)

- Platforms: `chatgpt.com`, `gemini.google.com`
- Export to Markdown with YAML frontmatter
- Direct write to selected Obsidian folder (File System Access API)
- Image download and local path replacement (`assets/` by default)
- Trigger methods: popup, floating button, keyboard shortcut, context menu
- Custom filename and subfolder templates

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

## First-time setup

1. Load extension in Chrome (`chrome://extensions` -> Developer mode -> Load unpacked).
2. Open extension Options page.
3. Click `Choose Obsidian folder` and authorize your vault.
4. Open a chat on `https://chatgpt.com` or `https://gemini.google.com` and export.

## Template variables

- `{platform}`
- `{title}`
- `{date}` (`YYYY-MM-DD`)
- `{time}` (`HHmmss`)
- `{datetime}` (`YYYY-MM-DD-HHmmss`)
- `{model}`

## License

CC BY-NC-SA 4.0 - See [LICENSE](LICENSE) for details.

This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. Non-commercial use only.

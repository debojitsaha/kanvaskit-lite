# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - Unreleased

### Added

- Editor core: plugin system, typed command registry, typed event bus, per-editor Zustand store, versioned scene document with Zod validation and migrations.
- React bindings: `EditorProvider`, `useEditor`, `useEditorStore`, `useCommand`.
- Viewport: artboard with presets and custom size, background color, zoom (buttons, wheel, keyboard, fit), pan with Space+drag or middle mouse.
- Objects: text, rectangle, ellipse, image from file or URL.
- Arrange: delete, duplicate, group and ungroup, bring forward, send backward, to front, to back, nudge with arrow keys.
- Keyboard shortcuts with a replaceable keymap.
- Layers panel: select, rename, lock, hide, reorder.
- Export to PNG cropped to the artboard; save and load scenes as JSON.
- Demo app.

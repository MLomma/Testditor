<script lang="ts">
import * as Y from "yjs";

import { IndexeddbPersistence } from "y-indexeddb";
// @ts-ignore
import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { editor, KeyMod, KeyCode, languages, IDisposable } from "monaco-editor";
import * as Utils from "../ts/utils";
import { navigateTo } from "../index";

// import * as MATHJS from "mathjs";
import { TableEditor, options, Point, Range } from "@susisu/mte-kernel";
import TextEditorInterface from "../ts/TextEditorInterface";

import Recorder from "./Recorder.vue";

var Emojis: { label: string; insertText: string; range: any }[] = [];
import("../ts/Emojis.ts").then((module) => {
  for (const [label, emoji] of module.Emojis) {
    Emojis.push({
      label: label + " " + emoji,
      insertText: emoji,
      range: null,
    });
  }
});

var Snippets: Array<{
  label: string;
  kind: languages.CompletionItemKind;
  documentation: string;
  insertText: string;
  range: any;
  command: { id: string };
}> = [];
import("../ts/Snippets.ts").then((module) => {
  for (const snippet of module.Snippets) {
    Snippets.push({
      label: snippet.label,
      kind: languages.CompletionItemKind.Text,
      documentation: snippet.documentation,
      insertText: snippet.insertText,
      range: null,
      command: {
        id: "editor.action.insertLineAfter",
      },
    });
  }
});

var Editor;
var tableEditor;
var provider;
var isCtrlPressed = false;
var MATHJS;

let completionProviders: IDisposable[] = [];

import("mathjs").then((module) => {
  MATHJS = module;
});

async function fileHash(arrayBuffer) {
  // Use the subtle crypto API to perform a SHA256 Sum of the file's
  // Array Buffer. The resulting hash is stored in an array buffer
  const hashAsArrayBuffer = await crypto.subtle.digest("SHA-1", arrayBuffer);

  // To display it as a string we will get the hexadecimal value of
  // each byte of the array buffer. This gets us an array where each byte
  // of the array buffer becomes one item in the array
  const uint8ViewOfHash = new Uint8Array(hashAsArrayBuffer);

  // We then convert it to a regular array so we can convert each item
  // to hexadecimal strings, where characters of 0-9 or a-f represent
  // a number between 0 and 15, containing 4 bits of information,
  // so 2 of them is 8 bits (1 byte).
  const hashAsString = Array.from(uint8ViewOfHash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashAsString;
}

function blobToUint8Array(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Define the onload event handler
    reader.onload = function (event) {
      const arrayBuffer = event.target?.result;
      if (!arrayBuffer || typeof arrayBuffer === "string") {
        reject("could not read file");
      } else {
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
        return;
      }
    };

    // Define the onerror event handler
    reader.onerror = function (error) {
      reject(error);
    };

    // Read the Blob as an ArrayBuffer
    reader.readAsArrayBuffer(blob);
  });
}

function toolbarAction(title: string, command: string, icon: string, extra: any = {}) {
  return { title, command, icon, ...extra };
}

const TOOLBAR_CATEGORIES = [
  {
    id: "text",
    label: "Text",
    groups: [
      {
        label: "Text formatting",
        actions: [
          toolbarAction("Bold", "bold", "bi-type-bold"),
          toolbarAction("Italic", "italic", "bi-type-italic"),
          toolbarAction("Underline", "underline", "bi-type-underline"),
          toolbarAction("Heading", "header", "bi-type-h1"),
          toolbarAction("Strikethrough", "strikethrough", "bi-type-strikethrough"),
          toolbarAction("Superscript", "superscript", "bi-superscript"),
          toolbarAction("Inline Code", "code-inline", "bi-code"),
          toolbarAction("Keyboard", "keyboard", "bi-keyboard"),
        ],
      },
      {
        label: "Structure",
        actions: [
          toolbarAction("List", "list-unordered", "bi-list-ul"),
          toolbarAction("Numbered List", "list-ordered", "bi-list-ol"),
          toolbarAction("Check List", "list-check", "bi-check-square"),
          toolbarAction("Quote", "quote", "bi-quote"),
          toolbarAction("Table", "table", "bi-table"),
          toolbarAction("Horizontal Line", "line", "bi-hr"),
        ],
      },
    ],
  },
  {
    id: "code",
    label: "Code",
    groups: [
      {
        label: "Code Blocks",
        actions: [
          toolbarAction("Code Block", "code", "bi-code-slash"),
          toolbarAction("Executable Code", "code-executable", "bi-terminal"),
          toolbarAction("Executable Code Project", "code-project", "bi-terminal-split"),
        ],
      },
    ],
  },
  {
    id: "media",
    label: "Medien",
    groups: [
      {
        label: "Embed or Link to Multimedia",
        actions: [
          toolbarAction("Link", "link", "bi-link-45deg"),
          toolbarAction("Image", "image", "bi-image"),
          toolbarAction("Audio", "audio", "bi-music-note-beamed"),
          toolbarAction("Movie", "movie", "bi-film"),
          toolbarAction("Try to embed any kind of link", "oembed", "bi-puzzle"),
        ],
      },
      {
        label: "Upload Multimedia",
        actions: [
          toolbarAction("Upload Image", "upload-image", "bi-upload", {
            overlayIcon: "bi-image",
          }),
          toolbarAction("Upload Audio", "upload-audio", "bi-upload", {
            overlayIcon: "bi-music-note-beamed",
          }),
          toolbarAction("Upload Movie", "upload-movie", "bi-upload", {
            overlayIcon: "bi-film",
          }),
        ],
      },
    ],
  },
  {
    id: "quiz",
    label: "Quiz",
    groups: [
      {
        label: "Quizzes",
        actions: [
          toolbarAction("Single Choice Quiz", "quiz-single-choice", "bi-x-circle", {
            overlayIcon: "bi-question-lg",
            reverseCompositeRoles: true,
          }),
          toolbarAction("Multiple Choice Quiz", "quiz-multiple-choice", "bi-x-square", {
            overlayIcon: "bi-question-lg",
            reverseCompositeRoles: true,
          }),
          toolbarAction("Text Input Quiz", "quiz-input", "bi-input-cursor-text", {
            overlayIcon: "bi-question-lg",
            reverseCompositeRoles: true,
          }),
          toolbarAction("Selection Quiz", "quiz-selection", "bi-option", {
            overlayIcon: "bi-question-lg",
            reverseCompositeRoles: true,
          }),
          toolbarAction("Matrix Quiz", "quiz-matrix", "bi-grid-3x3-gap", {
            overlayIcon: "bi-question-lg",
            reverseCompositeRoles: true,
          }),
          toolbarAction("Gap Text", "quiz-gap-text", "bi-body-text", {
            overlayIcon: "bi-question-lg",
            reverseCompositeRoles: true,
          }),
        ],
      },
    ],
  },
  {
    id: "math",
    label: "Mathe",
    groups: [
      {
        label: "Formulas with KaTeX",
        actions: [
          toolbarAction("Inline Formula", "formula-inline", "bi-currency-dollar"),
          toolbarAction("Formula Block", "formula", "bi-currency-dollar", {
            overlayIcon: "bi-currency-dollar",
          }),
        ],
      },
      {
        label: "ASCII-art drawings",
        actions: [
          toolbarAction("Graph", "graph", "bi-graph-down"),
          toolbarAction("ASCII-Art", "ascii", "bi-boxes"),
        ],
      },
    ],
  },
  {
    id: "effects",
    label: "Extras",
    groups: [
      {
        label: "LiaScript Effects",
        actions: [
          toolbarAction("Animation", "animation", "bi-lightning-fill", {
            overlayIcon: "bi-easel",
          }),
          toolbarAction("Comment", "comment", "bi-chat-text", {
            overlayIcon: "bi-easel",
          }),
          toolbarAction("Speak out loud", "tts", "bi-play-circle", {
            overlayIcon: "bi-easel",
          }),
        ],
      },
      {
        label: "Recorder",
        actions: [
          toolbarAction("Open audio recorder", "", "bi-mic", { recorder: "audio" }),
          toolbarAction("Open webcam recorder", "", "bi-webcam", { recorder: "webcam" }),
          toolbarAction("Open desktop recorder", "", "bi-camera-reels", {
            recorder: "desktop",
          }),
        ],
      },
    ],
  },
];

export default {
  name: "Editor",
  components: { Recorder },
  props: ["storageId", "content", "lights", "connection", "toolbar", "toolbarTarget"],

  data() {
    const config = Utils.loadConfig();

    return {
      editorLights: config.lights,
      user: config.user,
      activeToolbarCategory: TOOLBAR_CATEGORIES[0].id,
      recorder: { audio: false, webcam: false, desktop: false },

      online: null,
      upload: {
        image: null,
        audio: null,
        movie: null,
      },
      blob: null,
      globalDropHandler: null,
    };
  },

  computed: {
    toolbarCategories() {
      return TOOLBAR_CATEGORIES;
    },

    activeToolbarConfig() {
      return (
        TOOLBAR_CATEGORIES.find((category) => category.id === this.activeToolbarCategory) ||
        TOOLBAR_CATEGORIES[0]
      );
    },
  },

  methods: {
    actionColumns(actions) {
      const columns = [];
      let currentColumn = [];
      let currentUnits = 0;

      for (const action of actions) {
        const units = this.actionColumnUnits(action);

        if (currentColumn.length > 0 && currentUnits + units > 3) {
          columns.push(currentColumn);
          currentColumn = [];
          currentUnits = 0;
        }

        currentColumn.push(action);
        currentUnits += units;
      }

      if (currentColumn.length > 0) {
        columns.push(currentColumn);
      }

      return columns;
    },

    actionHasSquareButton(action) {
      return this.actionHasCompositeIcon(action);
    },

    actionHasCompositeIcon(action) {
      return Boolean(action.overlayIcon || action.overlayText);
    },

    actionPrimaryIconClass(action) {
      if (action.reverseCompositeRoles) {
        return action.icon;
      }

      return action.overlayIcon;
    },

    actionPrimaryText(action) {
      if (action.reverseCompositeRoles) {
        return "";
      }

      return action.overlayText;
    },

    actionIndexIconClass(action) {
      if (action.reverseCompositeRoles) {
        return action.overlayIcon;
      }

      return action.icon;
    },

    actionColumnUnits(action) {
      return this.actionHasSquareButton(action) ? 1.5 : 1;
    },

    actionLabel(action) {
      return action.title;
    },

    triggerToolbarAction(action) {
      if (action.recorder) {
        this.recorder[action.recorder] = true;
        return;
      }

      this.make(action.command);
      this.$emit("compile");
    },

    storeAudioFile(record) {
      if (record.blob) {
        const self = this;
        blobToUint8Array(record.blob)
          .then((uint8Array) => {
            const date = new Date();
            const filename = "recording-" + date.toISOString() + ".mp3";

            self.blob.set(filename, uint8Array);
            self.make("upload-audio", filename);
          })
          .catch((error) => {
            console.warn("Error:", error);
          });
      } else {
        console.warn("could not load file: ", record);
      }
    },

    storeVideoFile(blob) {
      if (blob) {
        const self = this;
        blobToUint8Array(blob)
          .then((uint8Array) => {
            const date = new Date();
            const filename = "recording-" + date.toISOString() + ".webm";

            self.blob.set(filename, uint8Array);
            self.make("upload-movie", filename);
          })
          .catch((error) => {
            console.warn("Error:", error);
          });
      } else {
        console.warn("could not load file: ", blob);
      }
    },

    getValue() {
      if (Editor) {
        return Editor.getValue();
      }
    },

    setValue(value: string) {
      if (!Editor) {
        return;
      }

      Editor.setValue(value);

      Editor.focus();
    },

    normalizeMediaSource(source: string) {
      if (!source) {
        return "";
      }

      let normalized = source.trim();

      if (normalized.startsWith(window.location.origin + "/")) {
        normalized = normalized.slice(window.location.origin.length + 1);
      }

      if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
        normalized = normalized.replace(/^\/+/, "");
      }

      try {
        return decodeURIComponent(normalized);
      } catch (_error) {
        return normalized;
      }
    },

    isStandaloneMediaLine(line: string) {
      return /^\s*(?:!\?\[\]\([^)\n]+\)|!\[\]\([^)\n]+\)|\?\[\]\([^)\n]+\))\s*$/.test(
        line
      );
    },

    normalizeReorderedMediaSpacing(lines: string[]) {
      const normalized: string[] = [];

      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];

        if (
          line.trim() === "" &&
          this.isStandaloneMediaLine(normalized[normalized.length - 1] || "")
        ) {
          continue;
        }

        normalized.push(line);

        if (
          this.isStandaloneMediaLine(line) &&
          this.isStandaloneMediaLine(lines[index + 1] || "")
        ) {
          normalized.push("");
        }
      }

      return normalized;
    },

    normalizeHeadingText(text: string) {
      return (text || "").replace(/\s+/g, " ").trim();
    },

    findSectionRangeByHeading(lines: string[], headingText: string) {
      const normalizedHeading = this.normalizeHeadingText(headingText);

      if (!normalizedHeading) {
        return null;
      }

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const match = lines[lineIndex].replace(/\r$/, "").match(/^(#{1,6})\s+(.*)$/);

        if (!match) {
          continue;
        }

        const level = match[1].length;
        const title = this.normalizeHeadingText(match[2]);

        if (title !== normalizedHeading) {
          continue;
        }

        let endExclusive = lines.length;

        for (let nextIndex = lineIndex + 1; nextIndex < lines.length; nextIndex++) {
          const nextMatch = lines[nextIndex].replace(/\r$/, "").match(/^(#{1,6})\s+(.*)$/);

          if (nextMatch && nextMatch[1].length <= level) {
            endExclusive = nextIndex;
            break;
          }
        }

        return {
          headingLineIndex: lineIndex,
          contentStart: lineIndex + 1,
          contentEndExclusive: endExclusive,
        };
      }

      return null;
    },

    getReorderableBlocks(lines: string[], start: number, endExclusive: number) {
      const blocks: Array<{ start: number; endExclusive: number; lines: string[] }> = [];
      let lineIndex = start;

      while (lineIndex < endExclusive) {
        while (lineIndex < endExclusive && lines[lineIndex].trim() === "") {
          lineIndex += 1;
        }

        if (lineIndex >= endExclusive) {
          break;
        }

        const blockStart = lineIndex;
        let blockEnd = lineIndex;
        let fenceDelimiter = "";

        while (blockEnd < endExclusive) {
          const line = lines[blockEnd];
          const fenceMatch = line.match(/^\s*(```+|~~~+)/);

          if (fenceMatch) {
            if (!fenceDelimiter) {
              fenceDelimiter = fenceMatch[1][0].repeat(fenceMatch[1].length);
            } else if (line.trim().startsWith(fenceDelimiter)) {
              fenceDelimiter = "";
            }

            blockEnd += 1;
            continue;
          }

          if (!fenceDelimiter && line.trim() === "") {
            break;
          }

          blockEnd += 1;
        }

        blocks.push({
          start: blockStart,
          endExclusive: blockEnd,
          lines: lines.slice(blockStart, blockEnd),
        });

        lineIndex = blockEnd;
      }

      return blocks;
    },

    isPreviewEditableBlock(lines: string[]) {
      const meaningfulLines = lines.filter((line) => line.trim() !== "");

      if (meaningfulLines.length === 0) {
        return false;
      }

      return meaningfulLines.every(
        (line) =>
          !/^\s*(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+|```|~~~|\|)/.test(line) &&
          !/(^|\s)(!\?\[|!\[|\?\?\[|\?\[|```|~~~|\{\{)/.test(line)
      );
    },

    getPreviewBlockText(params: { headingText: string; blockIndex: number }) {
      if (!Editor) {
        return null;
      }

      const code = Editor.getValue();

      if (!code) {
        return null;
      }

      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return null;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const targetBlock = blocks[params.blockIndex];

      if (!targetBlock || !this.isPreviewEditableBlock(targetBlock.lines)) {
        return null;
      }

      return targetBlock.lines.join("\n");
    },

    getPreviewBlockSource(params: { headingText: string; blockIndex: number }) {
      if (!Editor) {
        return null;
      }

      const code = Editor.getValue();

      if (!code) {
        return null;
      }

      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return null;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const targetBlock = blocks[params.blockIndex];

      if (!targetBlock) {
        return null;
      }

      return targetBlock.lines.join("\n");
    },

    getPreviewInlineTextSegments(params: { headingText: string; blockIndex: number }) {
      if (!Editor) {
        return null;
      }

      const code = Editor.getValue();

      if (!code) {
        return null;
      }

      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return null;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const targetBlock = blocks[params.blockIndex];

      if (!targetBlock || targetBlock.lines.length !== 1) {
        return null;
      }

      const line = targetBlock.lines[0];
      const tokenPattern = /(\[\[[^\]]*\]\])/g;
      const tokens = line.match(tokenPattern) || [];

      if (!tokens.length) {
        return null;
      }

      const segments = line.split(tokenPattern).filter((_, index) => index % 2 === 0);

      if (segments.length !== tokens.length + 1) {
        return null;
      }

      return {
        segments,
        tokens,
      };
    },

    getPreviewBlockRange(params: {
      headingText: string;
      blockIndex: number;
      startOffset: number;
      endOffset: number;
    }) {
      if (!Editor) {
        return null;
      }

      const code = Editor.getValue();

      if (!code) {
        return null;
      }

      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return null;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const targetBlock = blocks[params.blockIndex];

      if (!targetBlock || !this.isPreviewEditableBlock(targetBlock.lines)) {
        return null;
      }

      const blockText = targetBlock.lines.join("\n");
      const startOffset = Math.max(0, Math.min(params.startOffset, blockText.length));
      const endOffset = Math.max(startOffset, Math.min(params.endOffset, blockText.length));

      const toPosition = (offset: number) => {
        const prefix = blockText.slice(0, offset);
        const prefixLines = prefix.split("\n");
        const lineNumber = targetBlock.start + prefixLines.length;
        const column = prefixLines[prefixLines.length - 1].length + 1;

        return {
          lineNumber,
          column,
        };
      };

      const start = toPosition(startOffset);
      const end = toPosition(endOffset);

      return {
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
      };
    },

    getPreviewInlineRange(params: {
      headingText: string;
      blockIndex: number;
      segmentIndex: number;
      startOffset: number;
      endOffset: number;
    }) {
      if (!Editor) {
        return null;
      }

      const code = Editor.getValue();

      if (!code) {
        return null;
      }

      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return null;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const targetBlock = blocks[params.blockIndex];

      if (!targetBlock || targetBlock.lines.length !== 1) {
        return null;
      }

      const source = this.getPreviewInlineTextSegments({
        headingText: params.headingText,
        blockIndex: params.blockIndex,
      });

      if (!source || params.segmentIndex < 0 || params.segmentIndex >= source.segments.length) {
        return null;
      }

      let segmentStart = 0;

      for (let index = 0; index < params.segmentIndex; index++) {
        segmentStart += source.segments[index].length;

        if (index < source.tokens.length) {
          segmentStart += source.tokens[index].length;
        }
      }

      const segmentText = source.segments[params.segmentIndex] || "";
      const startOffset = Math.max(0, Math.min(params.startOffset, segmentText.length));
      const endOffset = Math.max(startOffset, Math.min(params.endOffset, segmentText.length));
      const lineNumber = targetBlock.start + 1;

      return {
        startLineNumber: lineNumber,
        startColumn: segmentStart + startOffset + 1,
        endLineNumber: lineNumber,
        endColumn: segmentStart + endOffset + 1,
      };
    },

    syncPreviewSelection(params: any) {
      if (!Editor) {
        return false;
      }

      const range =
        params?.kind === "inline"
          ? this.getPreviewInlineRange(params)
          : this.getPreviewBlockRange(params);

      if (!range) {
        return false;
      }

      Editor.setSelection(range);
      Editor.revealRangeInCenterIfOutsideViewport(range);
      return true;
    },

    normalizePreviewEditedText(text: string) {
      return text
        .replace(/\u00a0/g, " ")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.replace(/\s+$/g, ""))
        .join("\n")
        .trim();
    },

    normalizePreviewInlineSegmentText(text: string) {
      return text.replace(/\u00a0/g, " ").replace(/[\r\n]+/g, " ");
    },

    normalizePreviewSplitBlockText(text: string) {
      return text.replace(/\u00a0/g, " ").replace(/\r/g, "");
    },

    updatePreviewBlockText(params: { headingText: string; blockIndex: number; text: string }) {
      if (!Editor) {
        return false;
      }

      const code = Editor.getValue();

      if (!code) {
        return false;
      }

      const eol = Editor.getModel()?.getEOL() || "\n";
      const hasTrailingNewline = /\r?\n$/.test(code);
      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return false;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const targetBlock = blocks[params.blockIndex];

      if (!targetBlock || !this.isPreviewEditableBlock(targetBlock.lines)) {
        return false;
      }

      const normalizedText = this.normalizePreviewEditedText(params.text || "");
      const replacementLines = normalizedText ? normalizedText.split("\n") : [];
      const nextLines = [
        ...lines.slice(0, targetBlock.start),
        ...replacementLines,
        ...lines.slice(targetBlock.endExclusive),
      ];
      const nextCode = nextLines.join(eol) + (hasTrailingNewline ? eol : "");

      if (nextCode === code) {
        return false;
      }

      Editor.executeEdits("preview-text-edit", [
        {
          range: Editor.getModel().getFullModelRange(),
          text: nextCode,
        },
      ]);

      return true;
    },

    updatePreviewBlockSource(params: { headingText: string; blockIndex: number; text: string }) {
      if (!Editor) {
        return false;
      }

      const code = Editor.getValue();

      if (!code) {
        return false;
      }

      const eol = Editor.getModel()?.getEOL() || "\n";
      const hasTrailingNewline = /\r?\n$/.test(code);
      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return false;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const targetBlock = blocks[params.blockIndex];

      if (!targetBlock) {
        return false;
      }

      const normalizedText = (params.text || "").replace(/\u00a0/g, " ").replace(/\r/g, "");
      const replacementLines = normalizedText ? normalizedText.split("\n") : [];
      const nextLines = [
        ...lines.slice(0, targetBlock.start),
        ...replacementLines,
        ...lines.slice(targetBlock.endExclusive),
      ];
      const nextCode = nextLines.join(eol) + (hasTrailingNewline ? eol : "");

      if (nextCode === code) {
        return false;
      }

      Editor.executeEdits("preview-block-source-edit", [
        {
          range: Editor.getModel().getFullModelRange(),
          text: nextCode,
        },
      ]);

      return true;
    },

    updatePreviewHeaderImport(params: { importLine: string; enabled: boolean }) {
      if (!Editor) {
        return false;
      }

      const code = Editor.getValue();

      if (!code) {
        return false;
      }

      const eol = Editor.getModel()?.getEOL() || "\n";
      const hasTrailingNewline = /\r?\n$/.test(code);
      const lines = code.split(/\r?\n/);
      const importLine = (params.importLine || "").trim();

      if (!importLine) {
        return false;
      }

      const nextLines = [...lines];
      const firstNonEmptyIndex = nextLines.findIndex((line) => line.trim() !== "");

      if (firstNonEmptyIndex >= 0 && nextLines[firstNonEmptyIndex].trim() === "<!--") {
        let endIndex = -1;

        for (let index = firstNonEmptyIndex + 1; index < nextLines.length; index++) {
          if (nextLines[index].trim() === "-->") {
            endIndex = index;
            break;
          }
        }

        if (endIndex >= 0) {
          const existingIndex = nextLines.findIndex(
            (line, index) => index > firstNonEmptyIndex && index < endIndex && line.trim() === importLine
          );

          if (params.enabled) {
            if (existingIndex < 0) {
              nextLines.splice(endIndex, 0, importLine);
            }
          } else if (existingIndex >= 0) {
            nextLines.splice(existingIndex, 1);
          }
        }
      } else if (params.enabled) {
        nextLines.unshift("<!--", importLine, "-->", "");
      }

      const nextCode = nextLines.join(eol) + (hasTrailingNewline ? eol : "");

      if (nextCode === code) {
        return false;
      }

      Editor.executeEdits("preview-header-import-edit", [
        {
          range: Editor.getModel().getFullModelRange(),
          text: nextCode,
        },
      ]);

      return true;
    },

    updatePreviewInlineTextSegments(params: {
      headingText: string;
      blockIndex: number;
      segments: string[];
    }) {
      if (!Editor) {
        return false;
      }

      const code = Editor.getValue();

      if (!code) {
        return false;
      }

      const eol = Editor.getModel()?.getEOL() || "\n";
      const hasTrailingNewline = /\r?\n$/.test(code);
      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return false;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const targetBlock = blocks[params.blockIndex];

      if (!targetBlock || targetBlock.lines.length !== 1) {
        return false;
      }

      const source = this.getPreviewInlineTextSegments(params);

      if (!source || source.segments.length !== params.segments.length) {
        return false;
      }

      const nextSegments = params.segments.map((segment) =>
        this.normalizePreviewInlineSegmentText(segment || "")
      );
      let rebuiltLine = "";

      for (let index = 0; index < source.tokens.length; index++) {
        rebuiltLine += nextSegments[index] + source.tokens[index];
      }

      rebuiltLine += nextSegments[nextSegments.length - 1] || "";

      const nextLines = [
        ...lines.slice(0, targetBlock.start),
        rebuiltLine,
        ...lines.slice(targetBlock.endExclusive),
      ];
      const nextCode = nextLines.join(eol) + (hasTrailingNewline ? eol : "");

      if (nextCode === code) {
        return false;
      }

      Editor.executeEdits("preview-inline-text-edit", [
        {
          range: Editor.getModel().getFullModelRange(),
          text: nextCode,
        },
      ]);

      return true;
    },

    splitPreviewBlock(params: {
      headingText: string;
      blockIndex: number;
      beforeText: string;
      afterText: string;
    }) {
      if (!Editor) {
        return false;
      }

      const code = Editor.getValue();

      if (!code) {
        return false;
      }

      const eol = Editor.getModel()?.getEOL() || "\n";
      const hasTrailingNewline = /\r?\n$/.test(code);
      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return false;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const targetBlock = blocks[params.blockIndex];

      if (!targetBlock || !this.isPreviewEditableBlock(targetBlock.lines)) {
        return false;
      }

      const beforeText = this.normalizePreviewSplitBlockText(params.beforeText || "") || "\u200b";
      const afterText = this.normalizePreviewSplitBlockText(params.afterText || "") || "\u200b";
      const replacementLines = [
        ...beforeText.split("\n"),
        "",
        ...afterText.split("\n"),
      ];
      const nextLines = [
        ...lines.slice(0, targetBlock.start),
        ...replacementLines,
        ...lines.slice(targetBlock.endExclusive),
      ];
      const nextCode = nextLines.join(eol) + (hasTrailingNewline ? eol : "");

      if (nextCode === code) {
        return false;
      }

      Editor.executeEdits("preview-block-split", [
        {
          range: Editor.getModel().getFullModelRange(),
          text: nextCode,
        },
      ]);

      return true;
    },

    appendPreviewBlock(params: { headingText: string }) {
      if (!Editor) {
        return false;
      }

      const code = Editor.getValue();

      if (!code) {
        return false;
      }

      const eol = Editor.getModel()?.getEOL() || "\n";
      const hasTrailingNewline = /\r?\n$/.test(code);
      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return false;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const insertAt = blocks.length
        ? blocks[blocks.length - 1].endExclusive
        : section.contentStart;
      const leadingLines = lines.slice(section.contentStart, insertAt);
      const trailingLines = lines.slice(insertAt, section.contentEndExclusive);
      const rebuiltSectionLines = [...leadingLines];

      if (
        rebuiltSectionLines.length > 0 &&
        rebuiltSectionLines[rebuiltSectionLines.length - 1].trim() !== ""
      ) {
        rebuiltSectionLines.push("");
      }

      rebuiltSectionLines.push("\u200b");

      const nextLines = [
        ...lines.slice(0, section.contentStart),
        ...rebuiltSectionLines,
        ...trailingLines,
        ...lines.slice(section.contentEndExclusive),
      ];
      const nextCode = nextLines.join(eol) + (hasTrailingNewline ? eol : "");

      if (nextCode === code) {
        return false;
      }

      Editor.executeEdits("preview-block-append", [
        {
          range: Editor.getModel().getFullModelRange(),
          text: nextCode,
        },
      ]);

      return true;
    },

    mergePreviewBlocks(params: {
      headingText: string;
      blockIndex: number;
      direction: "backward" | "forward";
      currentText: string;
    }) {
      if (!Editor) {
        return false;
      }

      const code = Editor.getValue();

      if (!code) {
        return false;
      }

      const eol = Editor.getModel()?.getEOL() || "\n";
      const hasTrailingNewline = /\r?\n$/.test(code);
      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return false;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );
      const currentBlock = blocks[params.blockIndex];

      if (!currentBlock) {
        return false;
      }

      const normalizedCurrentText = this.normalizePreviewEditedText(params.currentText || "");
      const currentLines = normalizedCurrentText ? normalizedCurrentText.split("\n") : [];
      const directionOffset = params.direction === "backward" ? -1 : 1;
      const neighborIndex = params.blockIndex + directionOffset;
      const neighborBlock = blocks[neighborIndex];
      const orderedBlocks = blocks.map((block, index) =>
        index === params.blockIndex ? [...currentLines] : [...block.lines]
      );

      if (normalizedCurrentText) {
        if (!neighborBlock) {
          return false;
        }

        const currentMergedText = currentLines.join("\n");
        const neighborText = this.normalizePreviewEditedText(neighborBlock.lines.join("\n"));
        const leftIndex = params.direction === "backward" ? neighborIndex : params.blockIndex;
        const rightIndex = params.direction === "backward" ? params.blockIndex : neighborIndex;
        const mergedText =
          params.direction === "backward"
            ? `${neighborText}${currentMergedText}`
            : `${currentMergedText}${neighborText}`;

        orderedBlocks.splice(
          leftIndex,
          rightIndex - leftIndex + 1,
          mergedText ? mergedText.split("\n") : []
        );
      } else {
        orderedBlocks.splice(params.blockIndex, 1);
      }

      const leadingLines = lines.slice(section.contentStart, blocks[0]?.start || section.contentEndExclusive);
      const trailingLines = lines.slice(
        blocks[blocks.length - 1]?.endExclusive || section.contentStart,
        section.contentEndExclusive
      );
      const rebuiltSectionLines = [...leadingLines];

      orderedBlocks.forEach((blockLines, index) => {
        if (!blockLines.length) {
          return;
        }

        if (
          index > 0 &&
          rebuiltSectionLines.length > 0 &&
          rebuiltSectionLines[rebuiltSectionLines.length - 1].trim() !== ""
        ) {
          rebuiltSectionLines.push("");
        }

        rebuiltSectionLines.push(...blockLines);
      });

      rebuiltSectionLines.push(...trailingLines);

      const nextLines = [
        ...lines.slice(0, section.contentStart),
        ...rebuiltSectionLines,
        ...lines.slice(section.contentEndExclusive),
      ];
      const nextCode = nextLines.join(eol) + (hasTrailingNewline ? eol : "");

      if (nextCode === code) {
        return false;
      }

      Editor.executeEdits("preview-block-merge", [
        {
          range: Editor.getModel().getFullModelRange(),
          text: nextCode,
        },
      ]);

      Editor.focus();
      return true;
    },

    reorderPreviewBlocks(params: {
      headingText: string;
      draggedBlockIndex: number;
      targetBlockIndex: number;
      position: "before" | "after";
    }) {
      if (!Editor) {
        return false;
      }

      const code = Editor.getValue();

      if (!code) {
        return false;
      }

      const eol = Editor.getModel()?.getEOL() || "\n";
      const hasTrailingNewline = /\r?\n$/.test(code);
      const lines = code.split(/\r?\n/);
      const section = this.findSectionRangeByHeading(lines, params.headingText);

      if (!section) {
        return false;
      }

      const blocks = this.getReorderableBlocks(
        lines,
        section.contentStart,
        section.contentEndExclusive
      );

      const draggedBlock = blocks[params.draggedBlockIndex];
      const targetBlock = blocks[params.targetBlockIndex];

      if (!draggedBlock || !targetBlock || params.draggedBlockIndex === params.targetBlockIndex) {
        return false;
      }

      const orderedBlocks = blocks.map((block) => [...block.lines]);
      const movedBlock = orderedBlocks.splice(params.draggedBlockIndex, 1)[0];

      let insertAt = params.position === "after" ? params.targetBlockIndex + 1 : params.targetBlockIndex;

      if (params.draggedBlockIndex < insertAt) {
        insertAt -= 1;
      }

      orderedBlocks.splice(insertAt, 0, movedBlock);

      const leadingLines = lines.slice(section.contentStart, blocks[0]?.start || section.contentEndExclusive);
      const trailingLines = lines.slice(
        blocks[blocks.length - 1]?.endExclusive || section.contentStart,
        section.contentEndExclusive
      );
      const rebuiltSectionLines = [...leadingLines];

      orderedBlocks.forEach((blockLines, index) => {
        if (
          index > 0 &&
          rebuiltSectionLines.length > 0 &&
          rebuiltSectionLines[rebuiltSectionLines.length - 1].trim() !== ""
        ) {
          rebuiltSectionLines.push("");
        }

        rebuiltSectionLines.push(...blockLines);
      });

      rebuiltSectionLines.push(...trailingLines);

      const nextLines = [
        ...lines.slice(0, section.contentStart),
        ...rebuiltSectionLines,
        ...lines.slice(section.contentEndExclusive),
      ];
      const nextCode = nextLines.join(eol) + (hasTrailingNewline ? eol : "");

      if (nextCode === code) {
        return false;
      }

      Editor.executeEdits("preview-block-reorder", [
        {
          range: Editor.getModel().getFullModelRange(),
          text: nextCode,
        },
      ]);

      Editor.focus();
      return true;
    },

    reorderStandaloneMedia(params: {
      draggedSrc: string;
      draggedOccurrence: number;
      targetSrc: string;
      targetOccurrence: number;
      position: "before" | "after";
    }) {
      if (!Editor) {
        return false;
      }

      const code = Editor.getValue();

      if (!code) {
        return false;
      }

      const hasTrailingNewline = code.endsWith("\n");
      const lines = code.split("\n");
      const mediaLines: Array<{
        lineIndex: number;
        source: string;
        occurrence: number;
      }> = [];
      const occurrenceMap = new Map<string, number>();
      const mediaRegex = /!\?\[\]\(([^)\n]+)\)|!\[\]\(([^)\n]+)\)|\?\[\]\(([^)\n]+)\)/;

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const match = lines[lineIndex].match(mediaRegex);
        if (!match) {
          continue;
        }

        const rawSource = match[1] || match[2] || match[3] || "";
        const source = this.normalizeMediaSource(rawSource);
        const occurrence = occurrenceMap.get(source) || 0;

        occurrenceMap.set(source, occurrence + 1);
        mediaLines.push({ lineIndex, source, occurrence });
      }

      const draggedSource = this.normalizeMediaSource(params.draggedSrc);
      const targetSource = this.normalizeMediaSource(params.targetSrc);

      const dragged = mediaLines.find(
        (entry) =>
          entry.source === draggedSource && entry.occurrence === params.draggedOccurrence
      );
      const target = mediaLines.find(
        (entry) => entry.source === targetSource && entry.occurrence === params.targetOccurrence
      );

      if (!dragged || !target || dragged.lineIndex === target.lineIndex) {
        return false;
      }

      const orderedLines = [...lines];
      const movedLine = orderedLines.splice(dragged.lineIndex, 1)[0];

      let targetLineIndex = target.lineIndex;
      if (dragged.lineIndex < targetLineIndex) {
        targetLineIndex -= 1;
      }

      const insertAt =
        params.position === "after" ? targetLineIndex + 1 : targetLineIndex;

      orderedLines.splice(insertAt, 0, movedLine);

      const normalizedLines = this.normalizeReorderedMediaSpacing(orderedLines);

      const nextCode = normalizedLines.join("\n") + (hasTrailingNewline ? "\n" : "");

      if (nextCode === code) {
        return false;
      }

      Editor.executeEdits("preview-reorder", [
        {
          range: Editor.getModel().getFullModelRange(),
          text: nextCode,
        },
      ]);

      Editor.focus();
      return true;
    },

    zoomIn() {
      if (Editor) {
        Editor.trigger("toolbar", "editor.action.fontZoomIn", null);
        Editor.focus();
      }
    },

    zoomOut() {
      if (Editor) {
        Editor.trigger("toolbar", "editor.action.fontZoomOut", null);
        Editor.focus();
      }
    },

    getDroppedMediaCommand(file: File) {
      const mimeType = file.type.toLowerCase();

      if (mimeType.startsWith("image/")) {
        return "upload-image";
      }

      if (mimeType.startsWith("audio/")) {
        return "upload-audio";
      }

      if (mimeType.startsWith("video/")) {
        return "upload-movie";
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "";

      if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "avif"].includes(extension)) {
        return "upload-image";
      }

      if (["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "weba"].includes(extension)) {
        return "upload-audio";
      }

      if (["mp4", "webm", "mov", "avi", "mkv", "ogv", "m4v"].includes(extension)) {
        return "upload-movie";
      }

      return null;
    },

    createUploadedMediaMarkup(cmd: string, filename: string) {
      switch (cmd) {
        case "upload-image":
          return `![](${filename})`;
        case "upload-audio":
          return `?[](${filename})`;
        case "upload-movie":
          return `!?[](${filename})`;
        default:
          return filename;
      }
    },

    async insertDroppedMediaFiles(files: File[]) {
      if (!Editor || !files.length) {
        return false;
      }

      const snippets: string[] = [];

      for (const file of files) {
        const cmd = this.getDroppedMediaCommand(file);

        if (!cmd) {
          continue;
        }

        const arrayBuffer = await file.arrayBuffer();
        const blob = new Uint8Array(arrayBuffer);
        const hash = await fileHash(arrayBuffer);
        const extension = file.name.split(".").pop()?.toLowerCase();
        const filename = extension ? `${hash}.${extension}` : hash;

        this.blob.set(filename, blob);
        snippets.push(this.createUploadedMediaMarkup(cmd, filename));
      }

      if (!snippets.length) {
        return false;
      }

      const position = Editor.getPosition();

      Editor.executeEdits("", [
        {
          range: {
            startLineNumber: position?.lineNumber || 1,
            startColumn: position?.column || 1,
            endLineNumber: position?.lineNumber || 1,
            endColumn: position?.column || 1,
          },
          text: snippets.join("\n"),
        },
      ]);

      Editor.focus();
      return true;
    },

    make(cmd: string, data: any = null) {
      if (!Editor) return;

      const position = Editor.getPosition();
      const selection = Editor.getSelection();
      const range = {
        startLineNumber: selection?.startLineNumber || 1,
        startColumn: selection?.startColumn || 1,
        endLineNumber: selection?.endLineNumber || 1,
        endColumn: selection?.endColumn || 1,
      };
      const line = Editor.getModel().getLineContent(position.lineNumber);
      const text = Editor.getModel().getValueInRange(selection);

      let op = { range, text: "" };
      let move = 0;

      switch (cmd) {
        case "animation": {
          if (text) {
            if (text.match(/\n\s*\n/g)) {
              op.text = "      {{1}}\n<section>\n\n" + text + "\n\n</section>\n";
            } else {
              op.text = "      {{1}}\n" + text;
            }
          } else {
            op.text = "      {{1}}\n";
          }
          break;
        }

        case "ascii": {
          if (text) {
            op.text = "```ascii\n" + text + "\n```\n";
          } else {
            op.text = `\`\`\` ascii
 +------+   +-----+   +-----+   +-----+
 |      |   |     |   |     |   |     |      .----.
 | Foo  +-->| Bar +---+ Baz |<--+ Moo |     (  🦖  )
 |  🦅  |   |     |   |     |   |     |      \`----'
 +--+---+   +-----+   +--+--+   +--o--+
     \\         A         |        \/
      \\        |         |       \/
       V       |         V      \/
 .-------------+---------------+-------.
 | Hello here and there and everywhere |
 '-------------------------------------'

"  https://github.com/andre-dietrich/elm-svgbob/  "
\`\`\`

`;
          }
          break;
        }

        case "audio": {
          if (text) {
            op.text = `?[](${text})`;
          } else {
            op.text = "?[](https://)";
          }
          move = 2;
          break;
        }

        case "bold": {
          op.text = "__" + text + "__";
          if (text === "") {
            move = 2;
          }
          break;
        }

        case "code": {
          if (text) {
            op.text = "```\n" + text + "\n```";
          } else {
            op.text = '``` js\nvar message="Hello World"\nconsole.log(message)\n```';
          }

          break;
        }

        case "code-inline": {
          op.text = "`" + text + "`";
          if (text === "") {
            move = 1;
          }
          break;
        }

        case "code-executable": {
          if (text) {
            op.text = `\`\`\`\`
${text}
\`\`\`
<script>@input <\/script>
`;
          } else {
            op.text = `\`\`\` js
var message = "Hello World"
console.log(message)
message.length
\`\`\`
<script>@input <\/script>
`;
          }

          break;
        }

        case "code-project": {
          op.text = `\`\`\` js     -EvalScript.js
let who = data.first_name + " " + data.last_name;

if(data.online) {
  who + " is online";
} else {
  who + " is NOT online";
}
\`\`\`
\`\`\` json    +Data.json
{
  "first_name" :  "Sammy",
  "last_name"  :  "Shark",
  "online"     :  true
}
\`\`\`
<script>
  // insert the JSON dataset into the local variable data
  let data = @input(1);

  // eval the script that uses this dataset
  eval(\`@input(0)\`);
<\/script>
`;

          op.range = {
            startLineNumber: position.lineNumber || 1,
            startColumn: 0,
            endLineNumber: position.lineNumber || 1,
            endColumn: 1,
          };

          break;
        }

        case "comment": {
          op.text = "    --{{1}}--\n" + text;
          break;
        }

        case "graph": {
          op.range = {
            startLineNumber: position.lineNumber || 1,
            startColumn: 0,
            endLineNumber: position.lineNumber || 1,
            endColumn: 1,
          };

          op.text = `                                    Multiline
    1.9 |
        |                 ***
      y |               *     *
      - | r r r r r r r*r r r r*r r r r r r r
      a |             *         *
      x |            *           *
      i | B B B B B * B B B B B B * B B B B B
      s |         *                 *
        | *  * *                       * *  *
     -1 +------------------------------------
        0              x-axis               1

`;
          break;
        }

        case "formula": {
          if (text) {
            op.text = "$$\n" + text + "\n$$\n";
          } else {
            op.text = `$$
   \\sum_{i=1}^{\\infty}{\\frac{1}{n^2}
        =\\frac{\\pi^2}{6}}

% For more information see: https://katex.org
$$

`;
          }

          break;
        }

        case "formula-inline": {
          op.text = "$" + text + "$";
          if (text === "") {
            move = 1;
          }
          break;
        }

        case "header": {
          op.range = {
            startLineNumber: position.lineNumber || 1,
            startColumn: 0,
            endLineNumber: position.lineNumber || 1,
            endColumn: 1,
          };

          op.text = "#" + (line.startsWith(" ") || line.startsWith("#") ? "" : " ");

          break;
        }

        case "image": {
          if (text) {
            op.text = `![](${text})`;
          } else {
            op.text = "![](https://)";
          }
          move = 2;
          break;
        }

        case "init": {
          for (const el of Snippets) {
            if (el.label === "lia-template") {
              Editor.setValue(el.insertText);

              break;
            }
          }

          break;
        }

        case "italic": {
          op.text = "_" + text + "_";
          if (text === "") {
            move = 1;
          }
          break;
        }

        case "keyboard": {
          op.text = `<kbd>${text}<\/kbd>`;
          if (text === "") {
            move = 5;
          }
          break;
        }

        case "line": {
          op = {
            range: {
              startLineNumber: position.lineNumber || 1,
              startColumn: 0,
              endLineNumber: position.lineNumber || 1,
              endColumn: 1,
            },
            text: "---\n\n",
          };

          break;
        }

        case "link": {
          op.text = "[](https://)";
          move = 1;
          break;
        }

        case "list-check": {
          op.text = "- [ ] " + text.replace(/\n/g, "\n- [ ] ");
          break;
        }

        case "list-ordered": {
          if (text) {
            const lines = text.split("\n");

            for (let i = 0; i < lines.length; i++) {
              lines[i] = i + 1 + ". " + lines[i];
            }

            op.text = lines.join("\n");
          } else {
            op.text = "1. ";
          }

          break;
        }

        case "list-unordered": {
          op.text = "* " + text.replace(/\n/g, "\n* ");
          break;
        }

        case "movie": {
          if (text) {
            op.text = `!?[](${text})`;
          } else {
            op.text = `!?[](https://)`;
          }
          move = 3;
          break;
        }

        case "oembed": {
          if (text) {
            op.text = `??[](${text})`;
          } else {
            op.text = "??[](https://)";
          }
          move = 3;
          break;
        }

        case "quiz-gap-text": {
          op = {
            range: {
              startLineNumber: position.lineNumber || 1,
              startColumn: 0,
              endLineNumber: position.lineNumber || 1,
              endColumn: 1,
            },
            text: `__I (learn) [[  have been learning  ]] English for seven years now.__
But last year I (not / work) [[ was not working ]] hard enough for English,
that's why my marks (not / be) _[[ were not ]]_ really that good then.
As I (pass / want) [[ want to pass ]] my English exam successfully next year,
I (study) ~[[ am going to study ]]~ harder this term.

`,
          };
          break;
        }

        case "quiz-input": {
          if (text) {
            op.text = "[[" + text + "]]";
          } else {
            op.text = "[[solution]]";
          }
          break;
        }

        case "quiz-matrix": {
          op = {
            range: {
              startLineNumber: position.lineNumber || 1,
              startColumn: 0,
              endLineNumber: position.lineNumber || 1,
              endColumn: 1,
            },
            text: `- [[male (der)] (female [die]) [neuter (das)]]
- [    [X]           [ ]             [ ]     ]  Mann - German for man
- [    ( )           (X)             ( )     ]  Frau - German for woman
- [    ( )           ( )             (X)     ]  Mädchen - German for girl

`,
          };
          break;
        }

        case "quiz-multiple-choice": {
          op.text = "- [[ ]] " + text.replace(/\n/g, "\n- [[ ]] ");
          break;
        }

        case "quiz-single-choice": {
          if (text) {
            op.text = "- [( )] " + text.replace(/\n/g, "\n- [( )] ");
          } else {
            op.text = "- [( )] not checked\n- [(X)] checked";
          }

          break;
        }

        case "quiz-selection": {
          if (text) {
            op.text = "[[(" + text + ") | __wrong__ ]]";
          } else {
            op.text = "[[ wrong | __wrong too__ | (solution) ]]";
          }
          break;
        }

        case "quote": {
          op.text = "> " + text.replace(/\n/g, "\n> ");
          break;
        }

        case "strikethrough": {
          op.text = "~" + text + "~";
          if (text === "") {
            move = 1;
          }
          break;
        }

        case "superscript": {
          op.text = "^" + text + "^";
          if (text === "") {
            move = 1;
          }
          break;
        }

        case "table": {
          op = {
            range: {
              startLineNumber: position.lineNumber || 1,
              startColumn: 0,
              endLineNumber: position.lineNumber || 1,
              endColumn: 1,
            },
            text:
              "| Column 1 | Column 2 | Column 3 |\n| -------- | :------: | -------: |\n| Text     |   Text   |     Text |\n\n",
          };

          break;
        }

        case "tts": {
          op.text = "    {{|>}}\n" + text;
          break;
        }

        case "underline": {
          op.text = "~~" + text + "~~";
          if (text === "") {
            move = 2;
          }
          break;
        }

        case "upload-audio": {
          if (data) {
            op.text = `?[](${data})`;
            move = 2;
          } else {
            this.upload.audio.click();
          }

          break;
        }

        case "upload-image": {
          if (data) {
            op.text = `![](${data})`;
            move = 2;
          } else {
            this.upload.image.click();
          }

          break;
        }

        case "upload-movie": {
          if (data) {
            op.text = `!?[](${data})`;
            move = 3;
          } else {
            this.upload.movie.click();
          }

          break;
        }

        case "mathjs-evaluate": {
          try {
            op.text = MATHJS.format(MATHJS.evaluate(text, {}));
          } catch (e) {
            op.text = text;
          }

          break;
        }

        case "mathjs-tex": {
          try {
            op.text = MATHJS.parse(text).toTex();
          } catch (e) {
            op.text = text;
          }

          break;
        }

        case "mathjs-simplify": {
          try {
            op.text = MATHJS.format(MATHJS.simplify(text));
          } catch (e) {
            op.text = text;
          }

          break;
        }
      }

      Editor.executeEdits("", [op]);

      if (move) {
        Editor.setPosition({
          lineNumber: position.lineNumber,
          column: position.column + move,
        });
      }
      Editor.focus();
    },

    switchLights() {
      if (Editor) {
        const config = Utils.loadConfig();

        this.editorLights = !this.editorLights;
        Editor.updateOptions({
          theme: this.editorLights ? "vs-light" : "vs-dark",
        });

        config.lights = this.editorLights;

        Utils.storeConfig(config);
      }

      return this.editorLights;
    },

    getBlob(hash: string) {
      if (!this.blob) return;

      if (hash.startsWith("/")) {
        hash = hash.slice(1);
      }

      return this.blob.get(hash);
    },

    getAllBlobs() {
      if (!this.blob) return;

      const blobs: any[] = [];

      this.blob.forEach((data, name) => {
        blobs.push({ name, data });
      });

      return blobs;
    },

    gotoLine(line: number) {
      if (Editor) {
        Editor.setPosition({ lineNumber: line + 1, column: 0 });
        Editor.revealLineNearTop(line + 1);
        Editor.focus();
      }
    },

    fork() {
      const id = Utils.randomString(24);
      const yDoc = new Y.Doc();
      const yText = yDoc.getText(id);
      const yMap = yDoc.getMap("blob");

      if (this.blob !== null) {
        this.blob.forEach((value, key) => {
          yMap.set(key, value);
        });
      }

      yText.insert(0, this.getValue());

      const indexeddbProvider = new IndexeddbPersistence(id, yDoc);

      indexeddbProvider.on("synced", (event: any) => {
        console.log("liascript: fork");

        navigateTo("?/edit/" + id);
      });
    },

    initEditor(code: string) {
      const div = document.getElementById("liascript-editor");

      if (!div) {
        console.warn("No editor init");
        return;
      }

      const shouldInterceptDrop = (e: DragEvent) => {
        const droppedFiles = Array.from(e.dataTransfer?.files || []);

        if (droppedFiles.length) {
          return true;
        }

        const url = e.dataTransfer?.getData("text/uri-list");
        const textData = e.dataTransfer?.getData("text/plain");

        return Boolean(url || textData);
      };

      // Drag and drop handler for the editor
      div.addEventListener(
        "dragover",
        (e) => {
          if (shouldInterceptDrop(e)) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true
      );

      div.addEventListener(
        "drop",
        async (e) => {
          const droppedFiles = Array.from(e.dataTransfer?.files || []);

          if (shouldInterceptDrop(e)) {
            e.preventDefault();
            e.stopPropagation();
          }

          if (droppedFiles.length && Editor) {
            try {
              const handled = await this.insertDroppedMediaFiles(droppedFiles);

              if (handled) {
                return false;
              }
            } catch (error) {
              console.error("Could not handle dropped files:", error);
            }
          }

          // Zuerst prüfen, ob es sich um eine Markdown-Datei oder einen LiaScript-Link handelt
          let url = e.dataTransfer ? e.dataTransfer.getData("text/uri-list") : null;
          if (!url) {
            const textData = e.dataTransfer ? e.dataTransfer.getData("text/plain") : null;
            // Prüfen, ob der text bereits ein Markdown-Link ist
            if (textData && !/^\[.*\]\(.*\)$/.test(textData)) {
              url = textData;
            }
          }

          // Frühe Prüfung für Markdown oder LiaScript-Links
          const isMarkdownFile = url && url.toLowerCase().endsWith(".md");
          const liaScriptMatch =
            url && url.match(/https:\/\/liascript\.github\.io\/course\/\?(.*)/);

          // Nur für Markdown oder LiaScript-Links unser eigenes Handling verwenden
          if ((isMarkdownFile || liaScriptMatch) && Editor) {
            e.preventDefault();
            e.stopPropagation(); // Stoppt Weitergabe des Events an Monaco

            try {
              // Bei LiaScript-Link nehmen wir die eigentliche Markdown-URL
              const fetchUrl = liaScriptMatch
                ? decodeURIComponent(liaScriptMatch[1])
                : url;

              const markdownContent = await Utils.loadMarkdownImport(fetchUrl);

              if (!markdownContent) {
                throw new Error("Could not load markdown content");
              }

              const model = Editor.getModel();

              if (!model) {
                throw new Error("No editor model available");
              }

              const mergedContent = Utils.mergeMarkdownDocuments([
                model.getValue(),
                markdownContent,
              ]);

              Editor.executeEdits("", [
                {
                  range: model.getFullModelRange(),
                  text: mergedContent,
                },
              ]);

              Editor.focus();
              return false; // Verhindert weitere Verarbeitung
            } catch (error) {
              console.error("Could not load markdown:", error);

              // Bei Fehler: Nur für normale Markdown-Dateien als Fallback einen Link einfügen
              if (isMarkdownFile && !liaScriptMatch) {
                insertMarkdownLink(url, Editor);
              }
            }
          } else if (url && !isMarkdownFile && !liaScriptMatch && Editor) {
            // Für normale Links fügen wir einen Markdown-Link ein
            e.preventDefault();
            e.stopPropagation();
            insertMarkdownLink(url, Editor);
            return false;
          }
          // Für alle anderen Fälle: Monaco-Standardverhalten beibehalten
          return true;
        },
        true
      );

      // Hilfsfunktion zum Einfügen eines Markdown-Links
      function insertMarkdownLink(url, editor) {
        const position = editor.getPosition();

        editor.executeEdits("", [
          {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: `[](${url})`,
          },
        ]);

        // Cursor zwischen die eckigen Klammern setzen
        editor.setPosition({
          lineNumber: position.lineNumber,
          column: position.column + 1,
        });

        editor.focus();
      }

      const Editor = editor.create(div, {
        value: code,
        language: "markdown",
        theme: this.editorLights ? "vs-light" : "vs-dark",
        automaticLayout: true,
        wordWrap: "on",
        renderWhitespace: "boundary",
        wordBasedSuggestions: false, // disable default word suggestions
      });

      const self = this;

      Editor.addAction({
        // An unique identifier of the contributed action.
        id: "compile",
        // A label of the action that will be presented to the user.
        label: "LiaScript - Compile",
        // An optional array of keybindings for the action.
        keybindings: [KeyMod.CtrlCmd | KeyCode.KeyS],
        // A precondition for this action.
        precondition: undefined,
        // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
        keybindingContext: undefined,
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.5,
        // Method that will be executed when the action is triggered.
        // @param editor The editor instance is passed in as a convenience
        run: function (_: any) {
          self.$emit("compile");
        },
      });

      const snippetProvider = languages.registerCompletionItemProvider("markdown", {
        //triggerCharacters: ['['],

        provideCompletionItems: function (
          model,
          position,
          context
        ): languages.ProviderResult<languages.CompletionList> {
          const word = model.getWordAtPosition(position);

          if (
            word?.word.startsWith("lia") ||
            word?.word.startsWith("voice") ||
            word?.word.startsWith("hili")
          ) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word?.startColumn || 0,
              endColumn: word?.endColumn || 0,
            };

            for (let i = 0; i < Snippets.length; i++) {
              Snippets[i].range = range;
            }

            return {
              suggestions: Snippets,
            } as languages.ProviderResult<languages.CompletionList>;
          }

          return {
            suggestions: [],
          };
        },
      });

      completionProviders.push(snippetProvider);

      const emojiProvider = languages.registerCompletionItemProvider("markdown", {
        triggerCharacters: [":"],
        provideCompletionItems: function (
          model,
          position,
          context
        ): languages.ProviderResult<languages.CompletionList> {
          const word = model.getWordAtPosition(position);

          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: (word?.startColumn || position.column) - 1,
            endColumn: word?.endColumn || position.column,
          };

          if (
            model.getValueInRange(range) == "" ||
            model.getValueInRange(range).startsWith(":")
          ) {
            for (let i = 0; i < Emojis.length; i++) {
              Emojis[i].range = range;
            }

            return {
              suggestions: Emojis,
            } as languages.ProviderResult<languages.CompletionList>;
          }

          return {
            suggestions: [],
          };
        },
      });

      completionProviders.push(emojiProvider);

      languages.registerCodeActionProvider("markdown", {
        provideCodeActions(model, range, token) {
          if (isCtrlPressed) {
            isCtrlPressed = false;
            self.$emit("goto", range.startLineNumber);
          }
          return undefined;
        },
      });

      Editor.onKeyDown((e) => {
        if (e.keyCode == 5) {
          isCtrlPressed = true;
        }
      });

      Editor.onKeyUp((e) => {
        if (e.keyCode == 5) {
          isCtrlPressed = false;
        }
      });

      return this.toTableEditor(Editor);
    },

    toTableEditor(textEditor: any = null) {
      if (!textEditor) return;

      const Interface = new TextEditorInterface(textEditor);
      tableEditor = new TableEditor(Interface);

      textEditor.addAction({
        id: "table-format",
        label: "Table - Format",
        keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
        contextMenuGroupId: "2_modifications",
        contextMenuOrder: 2,

        run: function (_: any) {
          if (tableEditor) {
            if (tableEditor.cursorIsInTable(options({}))) {
              tableEditor.format(options({}));
            } else {
              textEditor.trigger("keyboard", "type", {
                text: "\n",
              });
            }
          }
        },
      });

      textEditor.addAction({
        id: "table-next",
        label: "Table - Jump to Next Cell",
        keybindings: [KeyCode.Tab],
        contextMenuGroupId: "2_modifications",
        contextMenuOrder: 2.1,

        run: function (_: any) {
          if (tableEditor) {
            if (tableEditor.cursorIsInTable(options({}))) {
              tableEditor.nextCell(options({}));
            } else {
              textEditor.trigger("keyboard", "type", {
                text: "    ",
              });
            }
          }
        },
      });

      textEditor.addAction({
        id: "table-previous",
        label: "Table - Jump to Previous Cell",
        keybindings: [KeyMod.Shift | KeyCode.Tab],
        contextMenuGroupId: "2_modifications",
        contextMenuOrder: 2.2,

        run: function (_: any) {
          if (tableEditor) {
            if (tableEditor.cursorIsInTable(options({}))) {
              tableEditor.previousCell(options({}));
            }
          }
        },
      });

      textEditor.addAction({
        id: "table-row",
        label: "Table - Add Row/Line",
        keybindings: [KeyMod.CtrlCmd | KeyCode.KeyL],
        contextMenuGroupId: "2_modifications",
        contextMenuOrder: 2.3,

        run: function (_: any) {
          if (tableEditor) {
            if (tableEditor.cursorIsInTable(options({}))) {
              tableEditor.insertRow(options({}));
            }
          }
        },
      });

      return textEditor;
    },

    registerGlobalDropGuard() {
      const preventFileNavigation = (e: DragEvent) => {
        if ((e.dataTransfer?.files?.length || 0) > 0) {
          e.preventDefault();
        }
      };

      window.addEventListener("dragover", preventFileNavigation, true);
      window.addEventListener("drop", preventFileNavigation, true);

      this.globalDropHandler = preventFileNavigation;
    },

    unregisterGlobalDropGuard() {
      if (!this.globalDropHandler) {
        return;
      }

      window.removeEventListener("dragover", this.globalDropHandler, true);
      window.removeEventListener("drop", this.globalDropHandler, true);
      this.globalDropHandler = null;
    },

    loadFromLocalStorage(editor: any, storageId: string) {
      const yDoc = new Y.Doc();

      switch (this.$props.connection) {
        case "webrtc": {
          provider = new WebrtcProvider(storageId, yDoc, {
            signaling: (process.env.SIGNALING_SERVER || "").split(" ") || [
              "wss://rooms.deno.dev",
            ],
            peerOpts: {
              config: {
                iceServers: JSON.parse(process.env.ICE_SERVERS || "[]"),
              },
            },
          });
          break;
        }
        case "websocket": {
          provider = new WebsocketProvider(
            process.env.WEBSOCKET_SERVER || "wss://aamkeaam.com/" + storageId,
            storageId,
            yDoc
          );
          break;
        }
        default: {
          provider = null;
        }
      }

      const indexeddbProvider = new IndexeddbPersistence(storageId, yDoc);
      const content = yDoc.getText(storageId);

      const self = this;
      indexeddbProvider.on("synced", (event: any) => {
        if (content.toString().trim().length === 0) {
          const template = Utils.consumePendingNewCourseTemplate();

          if (template) {
            content.insert(0, template);
          }
        }

        console.log("liascript: content from the database is loaded");
        self.$emit("ready");
      });

      if (provider) {
        provider.awareness.setLocalStateField("user", this.user);

        provider.on("status", (event: any) => {
          if (event.status === "connected") {
            self.online = 1;
          } else {
            self.online = 0;
          }
          self.$emit("online", self.online);
        });

        provider.awareness.on("change", (changes: any) => {
          // Whenever somebody updates their awareness information,
          // we log all awareness information from all users.

          const online = Array.from(provider.awareness.getStates().values()).length;

          if (online != self.online) {
            self.$emit("online", online);
            self.online = online;
          }
        });
      }
      this.blob = yDoc.getMap("blob");

      const monacoBinding = new MonacoBinding(
        content,
        editor.getModel(),
        new Set([editor]),
        provider ? provider.awareness : null
      );
    },
  },

  unmounted() {
    this.unregisterGlobalDropGuard();

    if (provider) provider.destroy();

    // Dispose completion providers
    completionProviders.forEach((disposable) => disposable.dispose());
    completionProviders = []; // Clear the array

    Editor = undefined;
  },

  emits: ["compile", "ready", "online", "goto"],

  mounted() {
    this.registerGlobalDropGuard();

    Editor = this.initEditor(this.content || "");

    if (provider) {
      provider.destroy();
    }

    if (this.storageId) {
      this.loadFromLocalStorage(Editor, this.storageId);
    } else {
      this.$emit("ready");
    }

    const self = this;

    const eventListener = function (media: string) {
      return function (event) {
        const file = event.target.files[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = async function (e) {
            if (
              e.target?.result === null ||
              e.target?.result === undefined ||
              typeof e.target?.result === "string"
            ) {
              console.warn("could not load file: ", file);
              return;
            }

            const blob = new Uint8Array(e.target?.result);
            const hash = await fileHash(e.target?.result);

            let fileEnding = file.name.split(".").pop();

            if (fileEnding) {
              fileEnding = "." + fileEnding.toLowerCase();
            } else {
              fileEnding = "";
            }

            console.warn("liascript: upload", e.target);

            if (blob) {
              self.blob.set(hash + fileEnding, blob);
              self.make("upload-" + media, hash + fileEnding);
            } else {
              console.warn("could not load file: ", file);
            }
          };

          reader.readAsArrayBuffer(file);
        }
      };
    };

    for (let media of ["image", "audio", "movie"]) {
      this.upload[media] = document.getElementById(media + "Input");

      if (this.upload[media])
        this.upload[media].addEventListener("change", eventListener(media), false);
    }
  },
};
</script>

<template>
  <div class="editor-shell notranslate" translate="no">
    <Teleport v-if="toolbar" :to="toolbarTarget || 'body'" :disabled="!toolbarTarget">
      <nav
        :data-bs-theme="editorLights ? 'light' : 'dark'"
        :class="[
          'navbar editor-toolbar',
          editorLights ? 'navbar-light bg-light' : 'navbar-dark bg-dark',
        ]"
      >
        <div class="btn-toolbar editor-category-toolbar" role="toolbar" aria-label="Toolbar categories">
          <div class="editor-category-group" role="group" aria-label="Toolbar categories">
            <button
              v-for="category in toolbarCategories"
              :key="category.id"
              class="btn btn-sm"
              :class="activeToolbarCategory === category.id ? 'btn-primary' : 'btn-outline-secondary'"
              type="button"
              :title="category.label"
              @click="activeToolbarCategory = category.id"
            >
              {{ category.label }}
            </button>
          </div>
        </div>

        <div
          class="btn-toolbar editor-main-toolbar"
          role="toolbar"
          :aria-label="`${activeToolbarConfig.label} toolbar`"
        >
          <div
            v-for="(group, groupIndex) in activeToolbarConfig.groups"
            :key="`${activeToolbarConfig.id}-${group.label}`"
            class="editor-toolbar-section"
            :class="{ 'editor-toolbar-section--separated': groupIndex > 0 }"
            role="group"
            :aria-label="group.label"
          >
            <div
              v-for="(column, columnIndex) in actionColumns(group.actions)"
              :key="`${group.label}-column-${columnIndex}`"
              class="editor-toolbar-column"
            >
              <div
                v-for="action in column"
                :key="`${group.label}-${action.title}`"
                class="editor-toolbar-action-row"
              >
                <button
                  class="btn btn-sm btn-outline-secondary editor-toolbar-action"
                  :class="{ 'editor-toolbar-action--square': actionHasSquareButton(action) }"
                  type="button"
                  :title="action.title"
                  @click="triggerToolbarAction(action)"
                >
                  <span
                    :class="[
                      'editor-toolbar-action__icon',
                      { 'editor-toolbar-action__icon--composite': actionHasCompositeIcon(action) },
                    ]"
                  >
                    <template v-if="actionHasCompositeIcon(action)">
                      <i
                        v-if="actionPrimaryIconClass(action)"
                        :class="['bi', actionPrimaryIconClass(action), 'icon-primary']"
                      ></i>
                      <span v-else-if="actionPrimaryText(action)" class="icon-primary icon-text">
                        {{ actionPrimaryText(action) }}
                      </span>
                    </template>
                    <i
                      v-if="actionIndexIconClass(action)"
                      :class="[
                        'bi',
                        actionIndexIconClass(action),
                        { 'icon-index': actionHasCompositeIcon(action) },
                      ]"
                    ></i>
                    <i
                      v-else-if="action.overlayIcon"
                      :class="['bi', action.overlayIcon]"
                    ></i>
                  </span>
                </button>
                <span class="editor-toolbar-action__label">{{ actionLabel(action) }}</span>
              </div>
            </div>
          </div>
        </div>

        <input type="file" id="imageInput" style="display: none" accept="image/*" />
        <input type="file" id="audioInput" style="display: none" accept="audio/*" />
        <input type="file" id="movieInput" style="display: none" accept="video/*" />

        <div class="btn-toolbar editor-zoom-toolbar" role="toolbar" aria-label="Editor zoom toolbar">
          <div
            class="editor-toolbar-group editor-toolbar-group--zoom"
            role="group"
            aria-label="Editor font zoom"
          >
            <button
              class="btn btn-sm btn-outline-secondary editor-toolbar-action"
              type="button"
              title="Editor Font Zoom In"
              @click="zoomIn()"
            >
              <span class="editor-toolbar-action__icon">
                <i class="bi bi-plus-lg"></i>
              </span>
            </button>

            <button
              class="btn btn-sm btn-outline-secondary editor-toolbar-action"
              type="button"
              title="Editor Font Zoom Out"
              @click="zoomOut()"
            >
              <span class="editor-toolbar-action__icon">
                <i class="bi bi-dash-lg"></i>
              </span>
            </button>

            <span class="editor-toolbar-action__label">Editor Font Zoom</span>
          </div>
        </div>
      </nav>
    </Teleport>

    <div
      style="
        z-index: 100;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "
      v-if="recorder.audio"
    >
      <div>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          style="position: absolute; z-index: 101; right: 12px; top: 10px"
          @click="recorder.audio = false"
        ></button>
        <audio-recorder :attempts="3" :time="2" :customUploader="storeAudioFile" />
      </div>
    </div>

    <div
      style="
        z-index: 100;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "
      v-if="recorder.webcam"
    >
      <div>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          style="position: absolute; z-index: 101; right: 12px; top: 10px"
          @click="recorder.webcam = false"
        ></button>
        <Recorder :storeBlob="storeVideoFile" stream="webcam" />
      </div>
    </div>

    <div
      style="
        z-index: 100;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "
      v-if="recorder.desktop"
    >
      <div>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          style="position: absolute; z-index: 101; right: 12px; top: 10px"
          @click="recorder.desktop = false"
        ></button>
        <Recorder :storeBlob="storeVideoFile" stream="desktop" />
      </div>
    </div>

    <div id="liascript-editor"></div>
  </div>
</template>

<style>
.editor-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.editor-shell[translate='no'],
.editor-shell[translate='no'] * {
  translate: no;
}

#liascript-editor {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.editor-toolbar {
  --editor-toolbar-bg: var(--bs-body-bg);
  border-top: 2px solid var(--bs-border-color);
  border-bottom: 2px solid var(--bs-border-color);
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.editor-toolbar.navbar-dark {
  --editor-toolbar-bg: #323232;
  background-color: #323232 !important;
}

.btn-sm {
  padding: 0.5rem 0.8rem 0.35rem 0.8rem;
}

.editor-toolbar-group {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
  margin: 0.12rem 0;
}

.editor-toolbar-group--zoom {
  flex-direction: row;
  align-items: center;
}

.editor-toolbar-section {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.55rem;
}

.editor-toolbar-section--separated {
  border-left: 1px solid rgba(var(--liveeditor-accent-rgb, 20, 115, 117), 0.95);
  padding-left: 0.9rem;
  margin-left: 0.2rem;
}

.editor-toolbar-column {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
}

.editor-toolbar-action-row {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.editor-toolbar .btn-outline-secondary,
.editor-toolbar .editor-toolbar-group > .btn {
  border-width: 2px;
}

.editor-toolbar .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.8rem;
  min-height: 2.5rem;
  border-radius: 0.7rem;
}

.editor-toolbar-action {
  white-space: nowrap;
}

.editor-toolbar-action--square {
  min-width: 2.25rem !important;
  width: 2.25rem !important;
  min-height: 2.25rem !important;
  height: 2.25rem !important;
  max-width: 2.25rem !important;
  max-height: 2.25rem !important;
  aspect-ratio: 1 / 1;
  flex: 0 0 2.25rem;
  padding: 0.24rem !important;
}

.editor-toolbar-action__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  min-width: 1rem;
  height: 1rem;
  line-height: 1;
}

.editor-toolbar-action__icon > .bi,
.editor-toolbar-action__icon > .icon-text {
  font-size: 0.875rem;
  line-height: 1;
}

.editor-toolbar-action__icon--composite {
  width: 1.35rem;
  min-width: 1.35rem;
  height: 1.35rem;
}

.editor-toolbar-action__icon--composite > .icon-primary {
  font-size: 0.9rem;
}

.editor-toolbar-action__icon--composite > .icon-text {
  font-style: normal;
  font-weight: 700;
}

.editor-toolbar-action__icon--composite > .icon-index {
  position: absolute;
  right: -0.24rem;
  bottom: -0.17rem;
  font-size: 0.6075rem;
}

.editor-toolbar-action--square .editor-toolbar-action__icon {
  width: 1.2rem;
  min-width: 1.2rem;
  height: 1.2rem;
}

.editor-toolbar-action--square .editor-toolbar-action__icon--composite {
  width: 1.28rem;
  min-width: 1.28rem;
  height: 1.28rem;
}

.editor-toolbar-action__label {
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.1;
  text-align: left;
  color: var(--bs-body-color);
  white-space: normal;
}

.editor-toolbar .btn > .bi,
.editor-toolbar .btn > i:not(.icon-overlay) {
  font-size: 1.75rem;
  line-height: 1;
}

.editor-toolbar .btn > .icon-overlay {
  font-size: 0.95rem !important;
}

.ar-icon {
  line-height: 2px !important;
}

.ar-recorder__records-limit {
  top: 66px !important;
}

@media (max-width: 896px) {
  .btn-sm {
    padding: 0.2rem 0.45rem 0.1rem 0.35rem;
  }

  .editor-toolbar-group {
    gap: 0.25rem;
  }

  .editor-toolbar-section {
    gap: 0.35rem;
  }

  .editor-toolbar-action-row {
    gap: 0.35rem;
  }

  .editor-toolbar-action__label {
    font-size: 0.64rem;
  }
}

.btn-toolbar {
  flex-wrap: wrap;
  flex-direction: row;
  flex-flow: row wrap;
}

.editor-main-toolbar,
.editor-category-toolbar,
.editor-zoom-toolbar {
  width: 100%;
}

.editor-category-toolbar {
  align-items: flex-end;
  padding: 0.75rem 1.35rem 0 1.35rem;
  overflow-x: auto;
  overflow-y: visible;
  gap: 0.85rem;
  position: relative;
}

.editor-category-group {
  --editor-tab-active-offset: 0px;
  display: inline-flex;
  flex-wrap: nowrap;
  padding: 0;
  gap: 0.9rem;
  position: relative;
  isolation: isolate;
}

.editor-category-group .btn {
  min-width: auto;
  min-height: 1.925rem;
  font-size: 0.95rem;
  font-weight: 700;
  border-top-left-radius: 1.15rem;
  border-top-right-radius: 1.15rem;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  position: relative;
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease,
    background-color 0.12s ease;
  border-width: 2px;
  padding-inline: 1rem;
  padding-top: 0.42rem !important;
  padding-bottom: 0.5rem !important;
  background-color: rgba(255, 255, 255, 0.02);
  color: var(--liveeditor-accent-color, #147375);
  box-shadow: inset 0 0 0 1px rgba(var(--liveeditor-accent-rgb, 20, 115, 117), 0.12);
  line-height: 1.05;
}

.editor-category-group .btn.btn-primary,
.editor-category-group .btn.btn-outline-secondary {
  min-height: 1.925rem !important;
  height: auto !important;
  padding-top: 0.42rem !important;
  padding-bottom: 0.5rem !important;
}

.editor-category-group .btn.btn-outline-secondary {
  opacity: 0.92;
  border-color: rgba(var(--liveeditor-accent-rgb, 20, 115, 117), 0.9);
}

.editor-category-group .btn.btn-outline-secondary:hover {
  opacity: 1;
  transform: translateY(-1px);
  background-color: rgba(var(--liveeditor-accent-rgb, 20, 115, 117), 0.1);
}

.editor-category-group .btn.btn-primary {
  background-color: var(--liveeditor-accent-color, #147375);
  color: #0f2c2c;
  border-color: var(--liveeditor-accent-color, #147375);
  box-shadow: 0 -0.15rem 0.4rem rgba(var(--liveeditor-accent-rgb, 20, 115, 117), 0.18);
  top: var(--editor-tab-active-offset);
  margin-bottom: calc(-1 * var(--editor-tab-active-offset));
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  z-index: 3;
}

.editor-category-group .btn.btn-primary::before,
.editor-category-group .btn.btn-primary::after {
  content: none;
}

.editor-category-group .btn.btn-primary::before {
  left: auto;
}

.editor-category-group .btn.btn-primary::after {
  right: auto;
}

.editor-toolbar.navbar-dark .editor-category-group .btn.btn-primary {
  background-color: var(--liveeditor-accent-color, #38cccc);
  color: #0f2c2c;
  border-color: var(--liveeditor-accent-color, #38cccc);
  box-shadow: 0 -0.18rem 0.62rem rgba(var(--liveeditor-accent-rgb, 56, 204, 204), 0.34);
}

.editor-toolbar.navbar-dark .editor-category-group .btn.btn-primary::before,
.editor-toolbar.navbar-dark .editor-category-group .btn.btn-primary::after {
  background-color: var(--editor-toolbar-bg);
}

.editor-main-toolbar {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.65rem;
  margin-top: -4px;
  padding: 0.55rem 0.7rem 0.45rem 0.7rem;
  border: 2px solid var(--liveeditor-accent-color, #147375);
  border-radius: 1rem 1rem 0 0;
  background-color: var(--editor-toolbar-bg);
  box-shadow: 0 0.2rem 0.75rem rgba(var(--liveeditor-accent-rgb, 20, 115, 117), 0.1);
}

.editor-main-toolbar .btn,
.editor-zoom-toolbar .btn {
  min-width: 6.4rem;
  min-height: 1.45rem;
  padding: 0.2rem 0.45rem 0.15rem 0.45rem;
}

.editor-main-toolbar .btn.editor-toolbar-action--square {
  min-width: 2.25rem !important;
  width: 2.25rem !important;
  min-height: 2.25rem !important;
  height: 2.25rem !important;
  max-width: 2.25rem !important;
  max-height: 2.25rem !important;
  aspect-ratio: 1 / 1;
  flex: 0 0 2.25rem;
  padding: 0.24rem !important;
}

.editor-main-toolbar .btn > .bi,
.editor-main-toolbar .btn > i:not(.icon-overlay),
.editor-zoom-toolbar .btn > .bi,
.editor-zoom-toolbar .btn > i:not(.icon-overlay) {
  font-size: 0.875rem;
}

.editor-main-toolbar .btn > .icon-overlay,
.editor-zoom-toolbar .btn > .icon-overlay {
  font-size: 0.475rem !important;
}

.editor-toolbar.navbar-dark .editor-main-toolbar {
  background-color: #323232;
  border-color: var(--liveeditor-accent-color, #38cccc);
}

.editor-zoom-toolbar {
  display: flex;
  align-items: center;
  padding: 0.55rem 0.7rem 0.25rem 0.7rem;
  border-top: 1px solid var(--bs-border-color);
}

.icon-overlay {
  top: -0.7rem;
  left: -0.3rem;
  font-size: 0.95rem !important;
  scale: 1;
  position: relative;
  display: inline-block;
  width: 0px;
}

.yRemoteSelection {
  background-color: rgb(250, 129, 0, 0.5);
}
.yRemoteSelectionHead {
  position: absolute;
  border-left: orange solid 2px;
  border-top: orange solid 2px;
  border-bottom: orange solid 2px;
  height: 100%;
  box-sizing: border-box;
}
.yRemoteSelectionHead::after {
  position: absolute;
  content: " ";
  border: 3px solid orange;
  border-radius: 4px;
  left: -4px;
  top: -5px;
}
</style>

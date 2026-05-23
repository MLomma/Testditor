<script lang="ts">
const INIT_CODE = `
var blob = {};
var previewDragState = null;
var previewPointerDragState = null;
var previewBlockDragState = null;
var previewReorderObserver = null;
var previewBlockOutlineStyleId = 'lia-preview-block-outline-style';

window.normalizePreviewSource = function (src) {
  if (!src) {
    return ''
  }

  if (src.startsWith(window.location.origin + '/')) {
    return decodeURIComponent(src.slice(window.location.origin.length + 1))
  }

  return decodeURIComponent(src)
}

window.ensurePreviewBlockOutlineStyle = function () {
  if (document.getElementById(previewBlockOutlineStyleId)) {
    return
  }

  const style = document.createElement('style')
  style.id = previewBlockOutlineStyleId
  style.textContent = [
    'main > .lia-preview-block {',
    '  position: relative;',
    '  border: 2px dashed rgba(56, 204, 204, 0.7);',
    '  border-radius: 0.9rem;',
    '  padding: 1rem 1.1rem;',
    '  margin-block: 1rem;',
    '  cursor: grab;',
    '}',
    'main > .lia-preview-block[data-lia-block-dragging="true"] {',
    '  cursor: grabbing;',
    '  opacity: 0.72;',
    '}',
    'main > .lia-preview-block[data-lia-block-drop="before"]::before,',
    'main > .lia-preview-block[data-lia-block-drop="after"]::after {',
    "  content: '';",
    '  position: absolute;',
    '  left: -0.15rem;',
    '  right: -0.15rem;',
    '  height: 0.3rem;',
    '  border-radius: 999px;',
    '  background: #38CCCC;',
    '  box-shadow: 0 0 0.55rem rgba(56, 204, 204, 0.95), 0 0 1.1rem rgba(56, 204, 204, 0.55);',
    '  pointer-events: none;',
    '}',
    'main > .lia-preview-block[data-lia-block-drop="before"]::before {',
    '  top: -0.75rem;',
    '}',
    'main > .lia-preview-block[data-lia-block-drop="after"]::after {',
    '  bottom: -0.75rem;',
    '}',
    'main > .lia-preview-block:first-child {',
    '  margin-top: 0.35rem;',
    '}',
    'main > .lia-preview-block > :first-child {',
    '  margin-top: 0;',
    '}',
    'main > .lia-preview-block > :last-child {',
    '  margin-bottom: 0;',
    '}',
  ].join('\n')

  document.head.appendChild(style)
}

window.decoratePreviewBlocks = function () {
  const main = document.querySelector('main')
  if (!main) {
    return
  }

  window.ensurePreviewBlockOutlineStyle()

  const blocks = main.querySelectorAll(':scope > *')
  let blockIndex = 0
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (!(block instanceof HTMLElement)) {
      continue
    }

    if (block.tagName === 'HEADER') {
      block.classList.remove('lia-preview-block')
      block.removeAttribute('data-lia-block-index')
      continue
    }

    block.classList.add('lia-preview-block')
    block.dataset.liaBlockIndex = String(blockIndex)
    blockIndex += 1
  }
}

window.clearPreviewBlockDropPreview = function () {
  const blocks = document.querySelectorAll('.lia-preview-block[data-lia-block-drop]')

  for (let i = 0; i < blocks.length; i++) {
    blocks[i].removeAttribute('data-lia-block-drop')
  }
}

window.clearPreviewBlockDragState = function () {
  previewBlockDragState = null

  const blocks = document.querySelectorAll('.lia-preview-block[data-lia-block-dragging]')

  for (let i = 0; i < blocks.length; i++) {
    blocks[i].removeAttribute('data-lia-block-dragging')
  }

  window.clearPreviewBlockDropPreview()
}

window.findPreviewBlockTarget = function (node) {
  if (!node || !node.closest) {
    return null
  }

  const candidate = node.closest('.lia-preview-block')

  return candidate && candidate.closest('main') ? candidate : null
}

window.installPreviewBlockReorderHandlers = function () {
  if (window.previewBlockReorderHandlersInstalled) {
    return
  }

  window.previewBlockReorderHandlersInstalled = true
}

window.bindPreviewBlockReorder = function (elem) {
  if (elem.dataset && elem.dataset.liaBlockReorderBound === 'true') {
    return
  }

  elem.draggable = true

  elem.addEventListener('dragstart', function (event) {
    const interactiveTarget =
      event.target && event.target.closest
        ? event.target.closest('input, textarea, select, button, a, label, summary, audio, video, img')
        : null

    if (interactiveTarget) {
      event.preventDefault()
      window.clearPreviewBlockDragState()
      return
    }

    previewBlockDragState = {
      blockIndex: Number(elem.dataset.liaBlockIndex || -1),
      headingText: (document.querySelector('main > header')?.textContent || '').trim(),
    }

    elem.dataset.liaBlockDragging = 'true'
    window.clearPreviewBlockDropPreview()

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', elem.dataset.liaBlockIndex || '')
    }
  })

  elem.addEventListener('dragover', function (event) {
    if (!previewBlockDragState) {
      return
    }

    const targetIndex = Number(elem.dataset.liaBlockIndex || -1)

    if (targetIndex < 0 || targetIndex === previewBlockDragState.blockIndex) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    window.clearPreviewBlockDropPreview()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }

    const rect = elem.getBoundingClientRect()
    const position = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'

    elem.dataset.liaBlockDrop = position
  })

  elem.addEventListener('dragleave', function (event) {
    if (!elem.contains(event.relatedTarget)) {
      elem.removeAttribute('data-lia-block-drop')
    }
  })

  elem.addEventListener('drop', function (event) {
    if (!previewBlockDragState) {
      return
    }

    const targetIndex = Number(elem.dataset.liaBlockIndex || -1)

    if (targetIndex < 0 || targetIndex === previewBlockDragState.blockIndex) {
      window.clearPreviewBlockDragState()
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const rect = elem.getBoundingClientRect()
    const position = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'

    parent.postMessage(
      {
        cmd: 'preview.reorder',
        param: {
          kind: 'block',
          headingText: previewBlockDragState.headingText,
          draggedBlockIndex: previewBlockDragState.blockIndex,
          targetBlockIndex: targetIndex,
          position,
        },
      },
      '*'
    )

    window.clearPreviewBlockDragState()
  })

  elem.addEventListener('dragend', function () {
    window.clearPreviewBlockDragState()
  })

  if (elem.dataset) {
    elem.dataset.liaBlockReorderBound = 'true'
  }
}

window.enablePreviewBlockReorder = function () {
  window.decoratePreviewBlocks()
  window.installPreviewBlockReorderHandlers()

  const blocks = document.querySelectorAll('main > .lia-preview-block')
  for (let i = 0; i < blocks.length; i++) {
    window.bindPreviewBlockReorder(blocks[i])
  }
}

window.getMediaSource = function (elem) {
  if (elem.dataset && elem.dataset.liaSource) {
    return elem.dataset.liaSource
  }

  const nestedMedia = elem.querySelector && elem.querySelector('img, audio, video, source')
  if (nestedMedia) {
    return window.getMediaSource(nestedMedia)
  }

  if (elem.tagName === 'AUDIO' || elem.tagName === 'VIDEO') {
    if (elem.currentSrc) {
      return elem.currentSrc
    }

    const source = elem.querySelector('source')
    if (source && source.src) {
      return source.src
    }
  }

  return elem.currentSrc || elem.src || ''
}

window.getPreviewMediaContainer = function (elem) {
  if (!elem) {
    return null
  }

  if (elem.closest) {
    const wrapper = elem.closest('.lia-figure__media, figure')
    if (wrapper) {
      return wrapper
    }

    return elem.closest('audio, video, img')
  }

  return elem
}

window.bindPreviewReorder = function (elem) {
  if (elem.dataset && elem.dataset.liaReorderBound === 'true') {
    return
  }

  elem.draggable = true
  elem.style.cursor = 'grab'

  elem.addEventListener('dragstart', function (event) {
    previewDragState = {
      src: elem.dataset.liaSource,
      occurrence: Number(elem.dataset.liaOccurrence || 0),
    }

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', elem.dataset.liaSource || '')
    }
  })

  elem.addEventListener('dragover', function (event) {
    if (!previewDragState) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  })

  elem.addEventListener('drop', function (event) {
    if (!previewDragState || !elem.dataset.liaSource) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const rect = elem.getBoundingClientRect()
    const position = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'

    parent.postMessage(
      {
        cmd: 'preview.reorder',
        param: {
          draggedSrc: previewDragState.src,
          draggedOccurrence: previewDragState.occurrence,
          targetSrc: elem.dataset.liaSource,
          targetOccurrence: Number(elem.dataset.liaOccurrence || 0),
          position,
        },
      },
      '*'
    )

    previewDragState = null
  })

  elem.addEventListener('dragend', function () {
    previewDragState = null
  })

  if (elem.dataset) {
    elem.dataset.liaReorderBound = 'true'
  }
}

window.postPreviewReorder = function (target, clientY) {
  if (!previewDragState || !target || !target.dataset.liaSource) {
    return
  }

  const rect = target.getBoundingClientRect()
  const position = clientY > rect.top + rect.height / 2 ? 'after' : 'before'

  parent.postMessage(
    {
      cmd: 'preview.reorder',
      param: {
        draggedSrc: previewDragState.src,
        draggedOccurrence: previewDragState.occurrence,
        targetSrc: target.dataset.liaSource,
        targetOccurrence: Number(target.dataset.liaOccurrence || 0),
        position,
      },
    },
    '*'
  )
}

window.findPreviewMediaTarget = function (node) {
  if (!node) {
    return null
  }

  if (node.closest) {
    const candidate = node.closest('[data-lia-source][data-lia-occurrence], .lia-figure__media, figure, img, audio, video')

    if (!candidate) {
      return null
    }

    const container = window.getPreviewMediaContainer(candidate)

    return container && container.closest('main') ? container : null
  }

  return null
}

window.installPreviewReorderHandlers = function () {
  if (window.previewReorderHandlersInstalled) {
    return
  }

  document.addEventListener(
    'dragover',
    function (event) {
      const target = window.findPreviewMediaTarget(event.target)

      if (!previewDragState || !target) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    },
    true
  )

  document.addEventListener(
    'drop',
    function (event) {
      const target = window.findPreviewMediaTarget(event.target)

      if (!previewDragState || !target || !target.dataset.liaSource) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const rect = target.getBoundingClientRect()
      window.postPreviewReorder(target, event.clientY)

      previewDragState = null
    },
    true
  )

  document.addEventListener(
    'pointerdown',
    function (event) {
      const target = window.findPreviewMediaTarget(event.target)

      if (!target || !target.dataset.liaSource) {
        previewPointerDragState = null
        return
      }

      previewPointerDragState = {
        src: target.dataset.liaSource,
        occurrence: Number(target.dataset.liaOccurrence || 0),
        startX: event.clientX,
        startY: event.clientY,
        active: false,
      }

      previewDragState = {
        src: target.dataset.liaSource,
        occurrence: Number(target.dataset.liaOccurrence || 0),
      }

      target.style.cursor = 'grabbing'
    },
    true
  )

  document.addEventListener(
    'pointermove',
    function (event) {
      if (!previewPointerDragState) {
        return
      }

      const deltaX = Math.abs(event.clientX - previewPointerDragState.startX)
      const deltaY = Math.abs(event.clientY - previewPointerDragState.startY)

      if (deltaX > 4 || deltaY > 4) {
        previewPointerDragState.active = true
      }
    },
    true
  )

  document.addEventListener(
    'pointerup',
    function (event) {
      if (!previewPointerDragState) {
        return
      }

      const target = window.findPreviewMediaTarget(document.elementFromPoint(event.clientX, event.clientY))
      const draggedSource = previewPointerDragState.src
      const draggedOccurrence = previewPointerDragState.occurrence
      const isActive = previewPointerDragState.active

      previewPointerDragState = null

      const draggedElem = document.querySelector(
        '[data-lia-source="' + CSS.escape(draggedSource) + '"][data-lia-occurrence="' + draggedOccurrence + '"]'
      )
      if (draggedElem) {
        draggedElem.style.cursor = 'grab'
      }

      if (!isActive || !target || !target.dataset.liaSource) {
        previewDragState = null
        return
      }

      if (
        target.dataset.liaSource === draggedSource &&
        Number(target.dataset.liaOccurrence || 0) === draggedOccurrence
      ) {
        previewDragState = null
        return
      }

      window.postPreviewReorder(target, event.clientY)
      previewDragState = null
    },
    true
  )

  window.previewReorderHandlersInstalled = true
}

window.enablePreviewReorder = function () {
  const media = document.querySelectorAll('main img, main audio, main video')
  const occurrences = {}

  window.installPreviewReorderHandlers()

  for (let i = 0; i < media.length; i++) {
    const elem = media[i]
    const container = window.getPreviewMediaContainer(elem) || elem
    let source = window.getMediaSource(elem)

    if (!source) {
      continue
    }

    source = window.normalizePreviewSource(source)
    elem.dataset.liaSource = source
    elem.dataset.liaOccurrence = String(occurrences[source] || 0)
    container.dataset.liaSource = source
    container.dataset.liaOccurrence = String(occurrences[source] || 0)
    occurrences[source] = (occurrences[source] || 0) + 1

    window.bindPreviewReorder(container)
  }
}

window.observePreviewReorder = function () {
  if (previewReorderObserver) {
    previewReorderObserver.disconnect()
  }

  previewReorderObserver = new MutationObserver(function () {
    if (window.enablePreviewReorder) {
      window.enablePreviewReorder()
    }

    if (window.enablePreviewBlockReorder) {
      window.enablePreviewBlockReorder()
    }
  })

  previewReorderObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

// TODO: Fix this HACK, so that preferBrowserTTS works as expected
if (window.LIA.settings?.preferBrowserTTS || false) {
  window.LIA.settings.preferBrowserTTS = false;
  window.LIA.settings.preferBrowserTTS = true;
}

window.injectHandler = function (param) {
  let url

  if (blob[param.src]) {
    url = blob[param.src]
  }
  else if (param.data) {
    url = URL.createObjectURL(param.data)
    blob[param.src] = url
  } else {
    return
  }

  const src = window.location.origin + param.src

  switch (param.tag) {
    case "img": {
      const images = document.querySelectorAll('img,picture')
      for (let i = 0; i < images.length; i++) {
        let image = images[i]
        if (image.src == src) {
          image.dataset.liaSource = param.src
          image.src = url

          if (image.onclick) {
            image.onclick = function () {
              window.LIA.img.click(url)
            }
          }
        }
      }

      break
    }

    case "audio": {
      const nodes = document.querySelectorAll('source')

      for (let i = 0; i < nodes.length; i++) {
        let elem = nodes[i]
        if (elem.src == src) {
          const parent = elem.parentNode
          if (!parent.paused) {
            parent.pause()
          }

          parent.dataset.liaSource = param.src

          elem.src = url
          elem.removeAttribute("onerror")

          // this forces the player to reload
          parent.innerHTML = elem.outerHTML
          parent.play()
        }
      }

      break
    }

    case "video": {
      let nodes = document.querySelectorAll('source')

      for (let i = 0; i < nodes.length; i++) {
        let elem = nodes[i]
        if (elem.src == src) {
          const parent = elem.parentNode
          parent.dataset.liaSource = param.src
          parent.src = url
          elem.src = url
          parent.load()
          parent.onloadeddata = function() {
            parent.play()
          }
        }
      }

      nodes = document.querySelectorAll('video')

      for (let i = 0; i < nodes.length; i++) {
        let elem = nodes[i]

        if (elem.src == src) {
          elem.src = url
          elem.load()
          elem.onloadeddata = function() {
            elem.play()
          }
        }
      }

      break
    }

    case "script": {
      const tag = document.createElement('script')
      tag.src = url
      document.head.appendChild(tag)

      break
    }

    case "link": {
      const tag = document.createElement('link')
      tag.href = url
      tag.rel = 'stylesheet'
      document.head.appendChild(tag)

      break
    }

    default: {
      console.warn("could not handle tag =>", param)
    }
  }
}


window.LIA.fetchError = (tag, src) => {
  if (src.startsWith("http") || src.startsWith("https")) {
    fetch(src)
      .then(response => response.blob())
      .then(blob => {
        window.injectHandler({tag, src, data: blob})
      })
      .catch(error => {
        console.error("could not fetch", src, error)
        parent.postMessage({cmd: 'media.load', param: {tag, src}}, "*")
      })
  }

  if (blob[src]) {
    window.injectHandler({tag, src})
  } else {
    parent.postMessage({cmd: 'media.load', param: {tag, src}}, "*")
  }
}

window.installPreviewReorderHandlers()
window.observePreviewReorder()
window.enablePreviewBlockReorder()
`;

export default {
  name: "Preview",

  emits: ["ready", "update", "goto", "reorder"],

  props: { fetchError: Function },

  data() {
    window.addEventListener(
      "message",
      (event) => {
        switch (event.data.cmd) {
          case "media.load": {
            const param = event.data.param;

            if (this.fetchError) {
              const blob = this.fetchError(param.src);
              //(param.tag, param.src);
              if (blob) {
                this.sendToLia("inject", {
                  tag: param.tag,
                  src: param.src,
                  data: new Blob(
                    [blob],
                    param.src.toLowerCase().endsWith(".svg")
                      ? { type: "image/svg+xml" }
                      : {}
                  ),
                });
              }
            }
            break;
          }

          case "preview.reorder": {
            this.$emit("reorder", event.data.param);
            break;
          }
        }
      },
      false
    );

    return {
      isReady: false,
      // @ts-ignore
      previewBlockPointerDragState: null,
      responsiveVoiceKey: process.env.RESPONSIVEVOICE_KEY,
      previewBlockObserver: null,
      sendToLia: null,
      origin: new URL("liascript/index.html?", window.location.origin + window.location.pathname).toString(),
    };
  },

  methods: {
    getPreviewBlockTarget(node: EventTarget | null) {
      if (!node || typeof (node as Element).closest !== "function") {
        return null;
      }

      return (node as Element).closest(".lia-preview-block") as HTMLElement | null;
    },

    clearPreviewBlockDropPreview(previewDocument?: Document | null) {
      const previewRoot = previewDocument || document.getElementById("liascript-preview")?.contentDocument;

      previewRoot
        ?.querySelectorAll(".lia-preview-block[data-lia-block-drop]")
        .forEach((node) => node.removeAttribute("data-lia-block-drop"));
    },

    clearPreviewBlockDragState(previewDocument?: Document | null) {
      const previewRoot = previewDocument || document.getElementById("liascript-preview")?.contentDocument;

      this.previewBlockPointerDragState = null;

      previewRoot
        ?.querySelectorAll(".lia-preview-block[data-lia-block-dragging]")
        .forEach((node) => node.removeAttribute("data-lia-block-dragging"));

      this.clearPreviewBlockDropPreview(previewRoot || undefined);
    },

    bindPreviewBlockInteractions() {
      const iframe = document.getElementById("liascript-preview") as HTMLIFrameElement | null;
      const previewDocument = iframe?.contentDocument;
      const main = previewDocument?.querySelector("main");

      if (!previewDocument?.body || !main) {
        return;
      }

      Array.from(main.querySelectorAll(":scope > .lia-preview-block")).forEach((node) => {
        if (!(node instanceof iframe.contentWindow!.HTMLElement)) {
          return;
        }

        if (node.dataset.liaBlockReorderBound === "true") {
          node.draggable = true;
          return;
        }

        node.draggable = true;

        node.addEventListener("dragstart", (event) => {
          const interactiveTarget =
            event.target && typeof (event.target as Element).closest === "function"
              ? (event.target as Element).closest(
                  "input, textarea, select, button, a, label, summary, audio, video, img"
                )
              : null;

          if (interactiveTarget) {
            event.preventDefault();
            this.clearPreviewBlockDragState(previewDocument);
            return;
          }

          this.previewBlockPointerDragState = {
            blockIndex: Number(node.dataset.liaBlockIndex || -1),
            headingText:
              (previewDocument.querySelector("main > header")?.textContent || "").trim(),
          };

          node.dataset.liaBlockDragging = "true";
          this.clearPreviewBlockDropPreview(previewDocument);

          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", node.dataset.liaBlockIndex || "");
          }
        });

        node.addEventListener("dragover", (event) => {
          const dragState = this.previewBlockPointerDragState;
          const targetIndex = Number(node.dataset.liaBlockIndex || -1);

          if (!dragState || targetIndex < 0 || targetIndex === dragState.blockIndex) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          this.clearPreviewBlockDropPreview(previewDocument);

          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
          }

          const rect = node.getBoundingClientRect();
          const position = event.clientY > rect.top + rect.height / 2 ? "after" : "before";

          node.dataset.liaBlockDrop = position;
        });

        node.addEventListener("dragleave", (event) => {
          if (!node.contains(event.relatedTarget as Node | null)) {
            node.removeAttribute("data-lia-block-drop");
          }
        });

        node.addEventListener("drop", (event) => {
          const dragState = this.previewBlockPointerDragState;
          const targetIndex = Number(node.dataset.liaBlockIndex || -1);

          if (!dragState || targetIndex < 0 || targetIndex === dragState.blockIndex) {
            this.clearPreviewBlockDragState(previewDocument);
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const rect = node.getBoundingClientRect();
          const position = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
          const payload = {
            kind: "block",
            headingText: dragState.headingText,
            draggedBlockIndex: dragState.blockIndex,
            targetBlockIndex: targetIndex,
            position,
          };
          const parent = this.$parent as any;

          if (typeof parent?.reorderPreviewMedia === "function") {
            parent.reorderPreviewMedia(payload);
          } else {
            this.$emit("reorder", payload);
          }

          this.clearPreviewBlockDragState(previewDocument);
        });

        node.addEventListener("dragend", () => {
          this.clearPreviewBlockDragState(previewDocument);
        });

        node.dataset.liaBlockReorderBound = "true";
      });
    },

    decoratePreviewBlocks() {
      const iframe = document.getElementById("liascript-preview") as HTMLIFrameElement | null;
      const previewDocument = iframe?.contentDocument;
      const main = previewDocument?.querySelector("main");

      if (!previewDocument?.head || !main) {
        return;
      }

      if (!previewDocument.getElementById("lia-preview-block-outline-style")) {
        const style = previewDocument.createElement("style");
        style.id = "lia-preview-block-outline-style";
        style.textContent = [
          "main > .lia-preview-block {",
          "  position: relative;",
          "  border: 2px dashed rgba(56, 204, 204, 0.7);",
          "  border-radius: 0.9rem;",
          "  padding: 1rem 1.1rem;",
          "  margin-block: 1rem;",
          "  cursor: grab;",
          "  transition: border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease;",
          "}",
          "main > .lia-preview-block[data-lia-block-dragging='true'] {",
          "  cursor: grabbing;",
          "  opacity: 0.72;",
          "}",
          "main > .lia-preview-block[data-lia-block-drop='before']::before,",
          "main > .lia-preview-block[data-lia-block-drop='after']::after {",
          "  content: '';",
          "  position: absolute;",
          "  left: -0.15rem;",
          "  right: -0.15rem;",
          "  height: 0.3rem;",
          "  border-radius: 999px;",
          "  background: #38CCCC;",
          "  box-shadow: 0 0 0.55rem rgba(56, 204, 204, 0.95), 0 0 1.1rem rgba(56, 204, 204, 0.55);",
          "  pointer-events: none;",
          "}",
          "main > .lia-preview-block[data-lia-block-drop='before']::before {",
          "  top: -0.75rem;",
          "}",
          "main > .lia-preview-block[data-lia-block-drop='after']::after {",
          "  bottom: -0.75rem;",
          "}",
          "main > .lia-preview-block:first-child {",
          "  margin-top: 0.35rem;",
          "}",
          "main > .lia-preview-block > :first-child {",
          "  margin-top: 0;",
          "}",
          "main > .lia-preview-block > :last-child {",
          "  margin-bottom: 0;",
          "}",
        ].join("\n");

        previewDocument.head.appendChild(style);
      }

      Array.from(main.children).forEach((node) => {
        if (!(node instanceof iframe.contentWindow!.HTMLElement)) {
          return;
        }

        if (node.tagName === "HEADER") {
          node.classList.remove("lia-preview-block");
          node.removeAttribute("data-lia-block-index");
          return;
        }

        node.classList.add("lia-preview-block");
        node.dataset.liaBlockIndex = String(
          main.querySelectorAll(":scope > .lia-preview-block").length
        );
      });

      let blockIndex = 0;
      Array.from(main.children).forEach((node) => {
        if (!(node instanceof iframe.contentWindow!.HTMLElement)) {
          return;
        }

        if (!node.classList.contains("lia-preview-block")) {
          return;
        }

        node.dataset.liaBlockIndex = String(blockIndex);
        blockIndex += 1;
      });

      this.bindPreviewBlockInteractions();

    },

    observePreviewBlocks() {
      const iframe = document.getElementById("liascript-preview") as HTMLIFrameElement | null;
      const previewDocument = iframe?.contentDocument;

      if (!previewDocument?.body) {
        return;
      }

      this.previewBlockObserver?.disconnect();
      this.previewBlockObserver = new MutationObserver(() => {
        this.decoratePreviewBlocks();
      });

      this.previewBlockObserver.observe(previewDocument.body, {
        childList: true,
        subtree: true,
      });

      this.decoratePreviewBlocks();
    },

    lockPreviewTranslation() {
      const iframe = document.getElementById("liascript-preview") as HTMLIFrameElement | null;

      iframe?.setAttribute("translate", "no");
      iframe?.classList.add("notranslate");

      const previewDocument = iframe?.contentDocument;

      if (!previewDocument?.documentElement || !previewDocument.body) {
        return;
      }

      previewDocument.documentElement.setAttribute("translate", "no");
      previewDocument.documentElement.classList.add("notranslate");
      previewDocument.body.setAttribute("translate", "no");
      previewDocument.body.classList.add("notranslate");

      this.observePreviewBlocks();
    },

    onReady(params: any) {
      const iframe = document.getElementById("liascript-preview") as HTMLIFrameElement;

      if (!this.isReady && iframe && iframe.contentWindow) {
        this.isReady = true;
        this.lockPreviewTranslation();

        // only inject if key has been defined
        if (this.responsiveVoiceKey) {
          iframe.contentWindow["LIA"].injectResposivevoice(this.responsiveVoiceKey);
        }

        // @ts-ignore
        this.$emit("ready", iframe.contentWindow["LIA"]);

        const self = this;
        iframe.contentWindow["LIA"].lineGoto = function (line: number) {
          self.$emit("goto", line);
        };

        this.sendToLia = function (cmd: string, param: any) {
          iframe.contentWindow?.postMessage({ cmd, param }, "*");
        };

        this.sendToLia("eval", INIT_CODE);
      }

      if (this.sendToLia) {
        this.sendToLia(
          "eval",
          "setTimeout(function(){ if (window.enablePreviewReorder) { window.enablePreviewReorder(); } if (window.enablePreviewBlockReorder) { window.enablePreviewBlockReorder(); } }, 0)"
        );
      }

      this.decoratePreviewBlocks();

      if (params) {
        this.$emit("update", params);
      }
    },
  },

  mounted() {
    const iframe = document.getElementById("liascript-preview");

    iframe?.addEventListener("load", this.lockPreviewTranslation);

    this.lockPreviewTranslation();

    // @ts-ignore
    if (iframe && iframe.contentWindow) {
      // @ts-ignore
      if (!iframe.contentWindow["LIA"]) {
        // @ts-ignore
        iframe.contentWindow["LIA"] = {};
      }

      // @ts-ignore
      iframe.contentWindow["LIA"].onReady = this.onReady;
    }
  },
};
</script>

<template>
  <iframe
    id="liascript-preview"
    class="notranslate"
    translate="no"
    :src="origin"
    allow="autoplay"
  ></iframe>
</template>

<style scoped>
#liascript-preview {
  height: 100%;
  width: 100%;
}

#liascript-preview[translate='no'] {
  translate: no;
}
</style>

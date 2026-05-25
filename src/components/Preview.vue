<script lang="ts">
const LIGHT_PREVIEW_ACCENT = "#147375";
const DARK_PREVIEW_ACCENT = "#38CCCC";
const LIGHT_PREVIEW_ACCENT_RGB = "20, 115, 117";
const DARK_PREVIEW_ACCENT_RGB = "56, 204, 204";
const PREVIEW_ACCENT_PLACEHOLDER = "__LIA_PREVIEW_ACCENT__";
const PREVIEW_ACCENT_RGB_PLACEHOLDER = "__LIA_PREVIEW_ACCENT_RGB__";

const INIT_CODE = `
var blob = {};
var previewDragState = null;
var previewPointerDragState = null;
var previewBlockDragState = null;
var previewReorderObserver = null;
var previewBlockOutlineStyleId = 'lia-preview-block-outline-style';
var previewBlockDragEdgeThreshold = 16;

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
    '  border: 2px dashed rgba(${PREVIEW_ACCENT_RGB_PLACEHOLDER}, 0.7);',
    '  border-radius: 0.9rem;',
    '  padding: 1rem 1.1rem;',
    '  margin-block: 1rem;',
    '  cursor: auto;',
    '}',
    'main > .lia-preview-block[data-lia-block-drag-hover="true"] {',
    '  cursor: grab;',
    '}',
    'main > .lia-preview-block[data-lia-block-dragging="true"] {',
    '  opacity: 0.72;',
    '  cursor: grabbing;',
    '}',
    'main > .lia-preview-block[data-lia-block-drop="before"]::before,',
    'main > .lia-preview-block[data-lia-block-drop="after"]::after {',
    "  content: '';",
    '  position: absolute;',
    '  left: -0.15rem;',
    '  right: -0.15rem;',
    '  height: 0.3rem;',
    '  border-radius: 999px;',
    '  background: ${PREVIEW_ACCENT_PLACEHOLDER};',
    '  box-shadow: 0 0 0.55rem rgba(${PREVIEW_ACCENT_RGB_PLACEHOLDER}, 0.95), 0 0 1.1rem rgba(${PREVIEW_ACCENT_RGB_PLACEHOLDER}, 0.55);',
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
  ].join('\\n')

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

    const staleHandle = block.querySelector(':scope > .lia-preview-block__drag-handle')
    if (staleHandle) {
      staleHandle.remove()
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

  const hoverBlocks = document.querySelectorAll('.lia-preview-block[data-lia-block-drag-hover]')

  for (let i = 0; i < hoverBlocks.length; i++) {
    hoverBlocks[i].removeAttribute('data-lia-block-drag-hover')
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

window.isPreviewBlockDragEdge = function (elem, clientX, clientY) {
  if (!elem || typeof clientX !== 'number' || typeof clientY !== 'number') {
    return false
  }

  const rect = elem.getBoundingClientRect()
  const offsetX = clientX - rect.left
  const offsetY = clientY - rect.top

  if (offsetX < 0 || offsetY < 0 || offsetX > rect.width || offsetY > rect.height) {
    return false
  }

  return (
    offsetX <= previewBlockDragEdgeThreshold ||
    offsetX >= rect.width - previewBlockDragEdgeThreshold ||
    offsetY <= previewBlockDragEdgeThreshold ||
    offsetY >= rect.height - previewBlockDragEdgeThreshold
  )
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

  const armDrag = function (event) {
    const enabled = window.isPreviewBlockDragEdge(elem, event.clientX, event.clientY)
    elem.draggable = enabled

    if (enabled) {
      elem.dataset.liaBlockDragArmed = 'true'
    } else {
      elem.removeAttribute('data-lia-block-drag-armed')
    }
  }

  const updateHoverState = function (event) {
    if (window.isPreviewBlockDragEdge(elem, event.clientX, event.clientY)) {
      elem.dataset.liaBlockDragHover = 'true'
    } else {
      elem.removeAttribute('data-lia-block-drag-hover')
    }
  }

  elem.draggable = false

  elem.addEventListener('pointermove', updateHoverState)
  elem.addEventListener('mousemove', updateHoverState)
  elem.addEventListener('pointerdown', armDrag)
  elem.addEventListener('mousedown', armDrag)
  elem.addEventListener('pointerleave', function () {
    if (!elem.hasAttribute('data-lia-block-dragging')) {
      elem.removeAttribute('data-lia-block-drag-hover')
    }
  })
  elem.addEventListener('mouseleave', function () {
    if (!elem.hasAttribute('data-lia-block-dragging')) {
      elem.removeAttribute('data-lia-block-drag-hover')
    }
  })

  elem.addEventListener('pointerup', function () {
    if (!elem.hasAttribute('data-lia-block-dragging')) {
      elem.draggable = false
      elem.removeAttribute('data-lia-block-drag-armed')
    }
  })

  elem.addEventListener('pointercancel', function () {
    if (!elem.hasAttribute('data-lia-block-dragging')) {
      elem.draggable = false
      elem.removeAttribute('data-lia-block-drag-armed')
    }
  })

  elem.addEventListener('dragstart', function (event) {
    if (elem.dataset.liaBlockDragArmed !== 'true') {
      event.preventDefault()
      window.clearPreviewBlockDragState()
      elem.draggable = false
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
    elem.draggable = false
    elem.removeAttribute('data-lia-block-drag-armed')
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
  }

  return elem
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

  emits: ["ready", "update", "goto", "reorder", "editText"],

  props: {
    fetchError: Function,
    lights: {
      type: Boolean,
      default: false,
    },
  },

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
      pendingPreviewBlockFocus: false,
      responsiveVoiceKey: process.env.RESPONSIVEVOICE_KEY,
      previewBlockObserver: null,
      sendToLia: null,
      origin: new URL("liascript/index.html?", window.location.origin + window.location.pathname).toString(),
    };
  },

  methods: {
    getPreviewAccentColor() {
      return this.lights ? LIGHT_PREVIEW_ACCENT : DARK_PREVIEW_ACCENT;
    },

    getPreviewAccentRgb() {
      return this.lights ? LIGHT_PREVIEW_ACCENT_RGB : DARK_PREVIEW_ACCENT_RGB;
    },

    getPreviewInitCode() {
      return INIT_CODE.replaceAll(PREVIEW_ACCENT_PLACEHOLDER, this.getPreviewAccentColor()).replaceAll(
        PREVIEW_ACCENT_RGB_PLACEHOLDER,
        this.getPreviewAccentRgb()
      );
    },

    getPreviewBlockOutlineCss() {
      const accentColor = this.getPreviewAccentColor();
      const accentRgb = this.getPreviewAccentRgb();

      return [
        "main > .lia-preview-block {",
        "  position: relative;",
        `  border: 2px dashed rgba(${accentRgb}, 0.7);`,
        "  border-radius: 0.9rem;",
        "  padding: 1rem 1.1rem;",
        "  margin-block: 1rem;",
        "  cursor: auto;",
        "  transition: border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease;",
        "}",
        "main > .lia-preview-block[data-lia-block-drag-hover='true'] {",
        "  cursor: grab;",
        "}",
        "main > .lia-preview-block [data-lia-preview-editable='true'] {",
        "  cursor: text;",
        "  user-select: text;",
        "  -webkit-user-select: text;",
        "  pointer-events: auto;",
        "  caret-color: currentColor;",
        "  white-space: pre-wrap;",
        "}",
        "main > .lia-preview-block [data-lia-preview-editable='true']:focus {",
        "  outline: 1px solid rgba(255, 255, 255, 0.25);",
        "  outline-offset: 0.15rem;",
        "}",
        ".lia-preview-quiz-settings {",
        "  position: fixed;",
        "  z-index: 2147483647;",
        "  min-width: 16rem;",
        "  padding: 0.75rem 0.85rem;",
        "  border: 1px solid rgba(" + accentRgb + ", 0.4);",
        "  border-radius: 0.75rem;",
        "  background: rgba(20, 24, 28, 0.94);",
        "  color: #fff;",
        "  box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.35);",
        "  display: grid;",
        "  gap: 0.75rem;",
        "}",
        ".lia-preview-quiz-settings[hidden] {",
        "  display: none;",
        "}",
        ".lia-preview-quiz-settings__row {",
        "  display: flex;",
        "  align-items: center;",
        "  gap: 0.65rem;",
        "}",
        ".lia-preview-quiz-settings__stack {",
        "  display: grid;",
        "  gap: 0.4rem;",
        "}",
        ".lia-preview-quiz-settings__checkbox {",
        "  inline-size: 1rem;",
        "  block-size: 1rem;",
        `  accent-color: ${accentColor};`,
        "  cursor: pointer;",
        "}",
        ".lia-preview-quiz-settings__label {",
        "  font-size: 15px;",
        "}",
        ".lia-preview-quiz-settings__input {",
        "  width: 100%;",
        "  border: 1px solid rgba(255,255,255,0.2);",
        "  border-radius: 0.45rem;",
        "  background: rgba(255,255,255,0.08);",
        "  color: inherit;",
        "  padding: 0.28rem 0.45rem;",
        "}",
        ".lia-preview-quiz-settings__input--tries {",
        "  width: 4.5rem;",
        "  margin-left: auto;",
        "}",
        ".lia-preview-quiz-settings__input:focus {",
        "  outline: 1px solid rgba(" + accentRgb + ", 0.75);",
        "  outline-offset: 0.08rem;",
        "}",
        ".lia-preview-quiz-settings__actions {",
        "  display: flex;",
        "  justify-content: flex-end;",
        "  gap: 0.5rem;",
        "}",
        ".lia-preview-quiz-settings__button {",
        "  border: 1px solid rgba(" + accentRgb + ", 0.45);",
        "  border-radius: 0.45rem;",
        "  background: rgba(" + accentRgb + ", 0.14);",
        "  color: inherit;",
        "  padding: 0.35rem 0.6rem;",
        "  cursor: pointer;",
        "}",
        "main > .lia-preview-block[data-lia-block-dragging='true'] {",
        "  opacity: 0.72;",
        "  cursor: grabbing;",
        "}",
        "main > .lia-preview-block[data-lia-preview-block-editor-open='true'] {",
        "  cursor: text;",
        "}",
        "main > .lia-preview-block > .lia-preview-block__editor {",
        "  display: block;",
        "  width: 100%;",
        "  min-height: 3.5rem;",
        "  border: 1px solid rgba(255, 255, 255, 0.28);",
        "  border-radius: 0.6rem;",
        "  background: rgba(0, 0, 0, 0.16);",
        "  color: inherit;",
        "  font: inherit;",
        "  line-height: inherit;",
        "  padding: 0.65rem 0.8rem;",
        "  resize: vertical;",
        "  outline: none;",
        "}",
        "main > .lia-preview-block[data-lia-block-drop='before']::before,",
        "main > .lia-preview-block[data-lia-block-drop='after']::after {",
        "  content: '';",
        "  position: absolute;",
        "  left: -0.15rem;",
        "  right: -0.15rem;",
        "  height: 0.3rem;",
        "  border-radius: 999px;",
        `  background: ${accentColor};`,
        `  box-shadow: 0 0 0.55rem rgba(${accentRgb}, 0.95), 0 0 1.1rem rgba(${accentRgb}, 0.55);`,
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
        "main > .lia-preview-insert-zone {",
        "  display: flex;",
        "  width: 100%;",
        "  align-items: center;",
        "  justify-content: center;",
        "  gap: 0.65rem;",
        "  min-height: 4.5rem;",
        "  margin: 1rem 0;",
        "  border: 2px dashed rgba(" + accentRgb + ", 0.45);",
        "  border-radius: 0.95rem;",
        "  background: rgba(" + accentRgb + ", 0.08);",
        "  color: inherit;",
        "  cursor: pointer;",
        "  transition: border-color 120ms ease, background-color 120ms ease, transform 120ms ease;",
        "}",
        "main > .lia-preview-insert-zone:hover,",
        "main > .lia-preview-insert-zone:focus-visible {",
        "  border-color: " + accentColor + ";",
        "  background: rgba(" + accentRgb + ", 0.15);",
        "  transform: translateY(-1px);",
        "  outline: none;",
        "}",
        "main > .lia-preview-insert-zone--empty {",
        "  min-height: 8rem;",
        "  margin-top: 1.25rem;",
        "  flex-direction: column;",
        "}",
        "main > .lia-preview-insert-zone__icon {",
        "  font-size: 1.65rem;",
        "  font-weight: 700;",
        "  line-height: 1;",
        "}",
        "main > .lia-preview-insert-zone__label {",
        "  font-weight: 600;",
        "}",
      ].join("\n");
    },

    requestPreviewBlockCreation(previewDocument: Document) {
      const createPreviewBlock = this.findPreviewParentMethod("createPreviewBlock");

      if (!createPreviewBlock) {
        return false;
      }

      const headingText = (previewDocument.querySelector("main > header")?.textContent || "").trim();

      if (!headingText) {
        return false;
      }

      this.pendingPreviewBlockFocus = true;

      const changed = Boolean(createPreviewBlock({ headingText }));

      if (!changed) {
        this.pendingPreviewBlockFocus = false;
      }

      return changed;
    },

    focusPendingPreviewBlock(previewDocument: Document, main: HTMLElement) {
      if (!this.pendingPreviewBlockFocus) {
        return;
      }

      const blocks = Array.from(main.querySelectorAll(":scope > .lia-preview-block")) as HTMLElement[];
      const targetBlock = blocks[blocks.length - 1];

      if (!targetBlock) {
        return;
      }

      const editableTarget = this.getPreviewEditableTextTarget(targetBlock);

      if (editableTarget) {
        this.focusPreviewEditableTargetAt(editableTarget, previewDocument, true);
        this.pendingPreviewBlockFocus = false;
        return;
      }

      if (this.shouldUsePreviewBlockSourceEditor(targetBlock)) {
        this.openPreviewBlockSourceEditor(targetBlock, previewDocument);
      }

      this.pendingPreviewBlockFocus = false;
    },

    bindPreviewInsertZones(previewDocument: Document, main: HTMLElement) {
      const syncZone = (
        zone: HTMLButtonElement,
        label: string,
        empty: boolean,
        kind: "empty" | "append"
      ) => {
        zone.type = "button";
        zone.dataset.liaPreviewInsertZone = kind;
        zone.className = empty
          ? "lia-preview-insert-zone lia-preview-insert-zone--empty"
          : "lia-preview-insert-zone";

        const currentLabel = zone.querySelector(":scope > .lia-preview-insert-zone__label");
        const currentIcon = zone.querySelector(":scope > .lia-preview-insert-zone__icon");

        if (!(currentLabel instanceof previewDocument.defaultView!.HTMLElement) || !currentIcon) {
          zone.innerHTML = `<span class="lia-preview-insert-zone__icon">+</span><span class="lia-preview-insert-zone__label">${label}</span>`;
        } else if (currentLabel.textContent !== label) {
          currentLabel.textContent = label;
        }

        if (zone.dataset.liaPreviewInsertBound !== "true") {
          zone.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.requestPreviewBlockCreation(previewDocument);
          });
          zone.dataset.liaPreviewInsertBound = "true";
        }

        return zone;
      };

      const ensureZone = (
        selector: string,
        label: string,
        empty: boolean,
        kind: "empty" | "append"
      ) => {
        const existing = main.querySelector(selector) as HTMLButtonElement | null;

        if (existing) {
          return syncZone(existing, label, empty, kind);
        }

        const button = previewDocument.createElement("button");
        return syncZone(button, label, empty, kind);
      };

      const blocks = Array.from(main.querySelectorAll(":scope > .lia-preview-block"));
      const emptyZone = main.querySelector(
        ':scope > .lia-preview-insert-zone[data-lia-preview-insert-zone="empty"]'
      );
      const appendZone = main.querySelector(
        ':scope > .lia-preview-insert-zone[data-lia-preview-insert-zone="append"]'
      );

      if (blocks.length === 0) {
        appendZone?.remove();
        const emptyZoneButton = ensureZone(
          ':scope > .lia-preview-insert-zone[data-lia-preview-insert-zone="empty"]',
          "Click to start writing",
          true,
          "empty"
        );
        const header = main.querySelector(":scope > header");

        if (header) {
          if (emptyZoneButton.previousElementSibling !== header) {
            header.insertAdjacentElement("afterend", emptyZoneButton);
          }
        } else if (main.firstElementChild !== emptyZoneButton) {
          main.prepend(emptyZoneButton);
        }

        return;
      }

      emptyZone?.remove();
      const appendZoneButton = ensureZone(
        ':scope > .lia-preview-insert-zone[data-lia-preview-insert-zone="append"]',
        "Click below to add a new block",
        false,
        "append"
      );

      if (main.lastElementChild !== appendZoneButton) {
        main.appendChild(appendZoneButton);
      }
    },

    getPreviewBlockTarget(node: EventTarget | null) {
      if (!node || typeof (node as Element).closest !== "function") {
        return null;
      }

      return (node as Element).closest(".lia-preview-block") as HTMLElement | null;
    },

    parsePreviewFormattedBlockSource(sourceText: string | null) {
      if (!sourceText || sourceText.includes("\n")) {
        return null;
      }

      const wrappers = [
        ["**", "**"],
        ["__", "__"],
        ["~~", "~~"],
        ["*", "*"],
        ["_", "_"],
        ["`", "`"],
      ] as const;

      for (const [prefix, suffix] of wrappers) {
        if (
          sourceText.startsWith(prefix) &&
          sourceText.endsWith(suffix) &&
          sourceText.length > prefix.length + suffix.length
        ) {
          return {
            prefix,
            suffix,
            text: sourceText.slice(prefix.length, sourceText.length - suffix.length),
          };
        }
      }

      return null;
    },

    getPreviewSimpleTextEditableTarget(node: HTMLElement) {
      const allowedTags = new Set([
        "SPAN",
        "P",
        "DIV",
        "BLOCKQUOTE",
        "A",
        "STRONG",
        "B",
        "EM",
        "I",
        "U",
        "S",
        "DEL",
        "MARK",
        "CODE",
        "KBD",
        "SUB",
        "SUP",
        "SMALL",
      ]);

      let current = node;

      while (current.children.length === 1) {
        const child = current.children[0] as HTMLElement;

        if (!allowedTags.has(child.tagName)) {
          break;
        }

        current = child;
      }

      if (!(current.textContent || "").trim()) {
        return null;
      }

      if (current === node && current.children.length === 0) {
        const existingLeafTarget = current.querySelector(':scope > span[data-lia-preview-leaf-target="true"]') as HTMLElement | null;

        if (existingLeafTarget) {
          return existingLeafTarget;
        }

        const leafTarget = current.ownerDocument.createElement("span");
        leafTarget.dataset.liaPreviewLeafTarget = "true";

        while (current.firstChild) {
          leafTarget.appendChild(current.firstChild);
        }

        current.appendChild(leafTarget);
        return leafTarget;
      }

      return current;
    },

    getPreviewEditableTextTarget(node: HTMLElement, previewDocument?: Document) {
      const visibleText = this.normalizePreviewEditableText(node.textContent || "");

      if (!visibleText) {
        return null;
      }

      if (
        node.querySelector(
          "img, audio, video, table, pre, input, textarea, select, button, svg, math, canvas, iframe, ul, ol, li, .lia-quiz"
        )
      ) {
        return null;
      }

      const formattedSource = previewDocument
        ? this.parsePreviewFormattedBlockSource(this.getPreviewBlockSourceText(node, previewDocument))
        : null;

      const simpleTextTarget = this.getPreviewSimpleTextEditableTarget(node);

      if (!simpleTextTarget) {
        return null;
      }

      if (formattedSource) {
        simpleTextTarget.dataset.liaPreviewSourcePrefix = formattedSource.prefix;
        simpleTextTarget.dataset.liaPreviewSourceSuffix = formattedSource.suffix;
      } else {
        delete simpleTextTarget.dataset.liaPreviewSourcePrefix;
        delete simpleTextTarget.dataset.liaPreviewSourceSuffix;
      }

      return simpleTextTarget;
    },

    findPreviewParentMethod(methodName: string) {
      let current: any = this.$parent;

      while (current) {
        if (typeof current[methodName] === "function") {
          return current[methodName].bind(current);
        }

        current = current.$parent;
      }

      return null;
    },

    normalizePreviewEditableText(text: string) {
      return text
        .replace(/\u00a0/g, " ")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.replace(/\s+$/g, ""))
        .join("\n")
        .trim();
    },

    normalizePreviewInlineSegmentText(text: string) {
      return text.replace(/\u00a0/g, " ").replace(/\u200b/g, "").replace(/[\r\n]+/g, " ");
    },

    getPreviewInlineSegmentText(target: HTMLElement) {
      return this.normalizePreviewInlineSegmentText(target.textContent || target.innerText || "");
    },

    ensurePreviewInlineTailTarget(paragraph: HTMLElement, inlineSegments: { textFragments: string[] }) {
      const trailingFragment = inlineSegments.textFragments[inlineSegments.textFragments.length - 1];

      if (typeof trailingFragment !== "string" || trailingFragment.length > 0) {
        paragraph
          .querySelectorAll(':scope > span[data-lia-preview-synthetic-tail="true"]')
          .forEach((node) => node.remove());
        return;
      }

      const lastChild = paragraph.lastElementChild as HTMLElement | null;

      if (!lastChild || lastChild.tagName !== "INPUT" || !lastChild.classList.contains("lia-input")) {
        return;
      }

      const existingTail = paragraph.querySelector(
        ':scope > span[data-lia-preview-synthetic-tail="true"]'
      ) as HTMLElement | null;

      if (existingTail) {
        if (!existingTail.textContent) {
          existingTail.textContent = "\u200b";
        }

        return;
      }

      const tailTarget = paragraph.ownerDocument.createElement("span");
      tailTarget.dataset.liaPreviewSyntheticTail = "true";
      tailTarget.textContent = "\u200b";
      lastChild.insertAdjacentElement("afterend", tailTarget);
    },

    resetPreviewSyntheticTailTarget(target: HTMLElement) {
      if (target.dataset.liaPreviewSyntheticTail === "true" && !(target.textContent || "")) {
        target.textContent = "\u200b";
      }
    },

    appendPreviewInlineBreakText(text: string) {
      if (text.endsWith("\n<br>\n")) {
        return `${text}<br>\n`;
      }

      if (text.endsWith("\n")) {
        return `${text}<br>\n`;
      }

      return `${text}\n<br>\n`;
    },

    markPreviewInlineGeneratedNode(node: HTMLElement) {
      node.dataset.liaPreviewGenerated = "true";
      return node;
    },

    cleanupPreviewInlineGeneratedNodes(paragraph: HTMLElement) {
      const activeElement = paragraph.ownerDocument.activeElement as HTMLElement | null;

      if (
        activeElement &&
        paragraph.contains(activeElement) &&
        activeElement.getAttribute("data-lia-preview-editable") === "true"
      ) {
        return;
      }

      paragraph
        .querySelectorAll(':scope > [data-lia-preview-generated="true"]')
        .forEach((node) => node.remove());
    },

    ensurePreviewEditableOutsideBlur(previewDocument: Document) {
      const body = previewDocument.body as HTMLBodyElement | null;

      if (!body || body.dataset.liaPreviewOutsideBlurBound === "true") {
        return;
      }

      this.ensurePreviewSelectionSync(previewDocument);

      previewDocument.addEventListener(
        "pointerdown",
        (event) => {
          const target = event.target as HTMLElement | null;

          if (
            target &&
            target.closest(
              '[data-lia-preview-editable="true"], input, textarea, select, button, a, label'
            )
          ) {
            return;
          }

          const activeElement = previewDocument.activeElement as HTMLElement | null;

          if (activeElement?.getAttribute("data-lia-preview-editable") === "true") {
            activeElement.blur();
          }
        },
        true
      );

      body.dataset.liaPreviewOutsideBlurBound = "true";
    },

    insertPlainTextIntoPreviewTarget(target: HTMLElement, text: string, previewDocument: Document) {
      const selection = previewDocument.getSelection();

      if (!selection || selection.rangeCount === 0) {
        target.textContent = `${target.textContent || ""}${text}`;
        return;
      }

      const range = selection.getRangeAt(0);
      range.deleteContents();

      const textNode = previewDocument.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);

      selection.removeAllRanges();
      selection.addRange(range);
    },

    focusPreviewEditableTarget(target: HTMLElement, previewDocument: Document) {
      this.focusPreviewEditableTargetAt(target, previewDocument, false);
    },

    previewSelectionIsInsideTarget(target: HTMLElement, previewDocument: Document) {
      const selection = previewDocument.getSelection();

      return Boolean(selection && target.contains(selection.anchorNode));
    },

    getPreviewSelectionTarget(previewDocument: Document) {
      const selection = previewDocument.getSelection();

      if (!selection || selection.rangeCount === 0 || !selection.anchorNode) {
        return null;
      }

      const anchorElement =
        selection.anchorNode.nodeType === Node.ELEMENT_NODE
          ? (selection.anchorNode as HTMLElement)
          : selection.anchorNode.parentElement;

      if (!anchorElement) {
        return null;
      }

      const editableTarget = anchorElement.closest('[data-lia-preview-editable="true"]') as HTMLElement | null;

      if (!editableTarget || !selection.focusNode || !editableTarget.contains(selection.focusNode)) {
        return null;
      }

      return editableTarget;
    },

    getPreviewTargetSelectionOffsets(target: HTMLElement, previewDocument: Document) {
      const selection = previewDocument.getSelection();

      if (!selection || selection.rangeCount === 0) {
        return null;
      }

      const range = selection.getRangeAt(0);

      if (!target.contains(range.startContainer) || !target.contains(range.endContainer)) {
        return null;
      }

      const startRange = previewDocument.createRange();
      startRange.selectNodeContents(target);
      startRange.setEnd(range.startContainer, range.startOffset);

      const endRange = previewDocument.createRange();
      endRange.selectNodeContents(target);
      endRange.setEnd(range.endContainer, range.endOffset);

      return {
        startOffset: startRange.toString().length,
        endOffset: endRange.toString().length,
      };
    },

    syncPreviewTextSelection(node: HTMLElement, target: HTMLElement, previewDocument: Document) {
      const syncPreviewSelection = this.findPreviewParentMethod("syncPreviewSelection");
      const offsets = this.getPreviewTargetSelectionOffsets(target, previewDocument);
      const sourcePrefixLength = (target.dataset.liaPreviewSourcePrefix || "").length;

      if (!syncPreviewSelection || !offsets) {
        return false;
      }

      return Boolean(
        syncPreviewSelection({
          kind: "block",
          headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
          blockIndex: Number(node.dataset.liaBlockIndex || -1),
          startOffset: offsets.startOffset + sourcePrefixLength,
          endOffset: offsets.endOffset + sourcePrefixLength,
        })
      );
    },

    syncPreviewInlineSelection(
      node: HTMLElement,
      target: HTMLElement,
      previewDocument: Document,
      inlineEditableTargets: HTMLElement[]
    ) {
      const syncPreviewSelection = this.findPreviewParentMethod("syncPreviewSelection");
      const offsets = this.getPreviewTargetSelectionOffsets(target, previewDocument);
      const segmentIndex = inlineEditableTargets.indexOf(target);

      if (!syncPreviewSelection || !offsets || segmentIndex < 0) {
        return false;
      }

      return Boolean(
        syncPreviewSelection({
          kind: "inline",
          headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
          blockIndex: Number(node.dataset.liaBlockIndex || -1),
          segmentIndex,
          startOffset: offsets.startOffset,
          endOffset: offsets.endOffset,
        })
      );
    },

    syncPreviewSelectionFromDocument(previewDocument: Document) {
      const target = this.getPreviewSelectionTarget(previewDocument);

      if (!target) {
        return false;
      }

      const node = target.closest(".lia-preview-block") as HTMLElement | null;

      if (!node) {
        return false;
      }

      if (target.dataset.liaPreviewInlineSegmentIndex !== undefined) {
        const inlineEditableTargets = this.getPreviewInlineEditableTargets(node, previewDocument);

        if (!inlineEditableTargets) {
          return false;
        }

        return this.syncPreviewInlineSelection(node, target, previewDocument, inlineEditableTargets);
      }

      return this.syncPreviewTextSelection(node, target, previewDocument);
    },

    ensurePreviewSelectionSync(previewDocument: Document) {
      const body = previewDocument.body as HTMLBodyElement | null;

      if (!body || body.dataset.liaPreviewSelectionSyncBound === "true") {
        return;
      }

      previewDocument.addEventListener("selectionchange", () => {
        this.syncPreviewSelectionFromDocument(previewDocument);
      });

      body.dataset.liaPreviewSelectionSyncBound = "true";
    },

    placePreviewCaretFromPoint(
      target: HTMLElement,
      previewDocument: Document,
      clientX: number,
      clientY: number
    ) {
      const previewWindow = previewDocument.defaultView as (Window & {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      }) | null;

      if (!previewWindow) {
        return false;
      }

      let range: Range | null = null;
      const caretPosition = previewWindow.caretPositionFromPoint?.(clientX, clientY);

      if (caretPosition) {
        range = previewDocument.createRange();
        range.setStart(caretPosition.offsetNode, caretPosition.offset);
        range.collapse(true);
      } else {
        range = previewWindow.caretRangeFromPoint?.(clientX, clientY) || null;
      }

      if (!range || !target.contains(range.startContainer)) {
        return false;
      }

      target.focus();

      const selection = previewDocument.getSelection();

      if (!selection) {
        return false;
      }

      selection.removeAllRanges();
      selection.addRange(range);

      return true;
    },

    focusPreviewEditableTargetAt(target: HTMLElement, previewDocument: Document, collapseToStart: boolean) {
      target.focus();

      const selection = previewDocument.getSelection();

      if (!selection) {
        return;
      }

      const range = previewDocument.createRange();
      range.selectNodeContents(target);
      range.collapse(collapseToStart);

      selection.removeAllRanges();
      selection.addRange(range);
    },

    getPreviewEditableTargetOffset(target: HTMLElement, previewDocument: Document) {
      const selection = previewDocument.getSelection();

      if (!selection || selection.rangeCount === 0) {
        return this.getPreviewInlineSegmentText(target).length;
      }

      const range = selection.getRangeAt(0);

      if (!target.contains(range.startContainer)) {
        return this.getPreviewInlineSegmentText(target).length;
      }

      const measurementRange = previewDocument.createRange();
      measurementRange.selectNodeContents(target);
      measurementRange.setEnd(range.startContainer, range.startOffset);

      return measurementRange.toString().length;
    },

    getPreviewEditableTargetText(target: HTMLElement) {
      return target.innerText || target.textContent || "";
    },

    isPreviewEditableSelectionCollapsed(target: HTMLElement, previewDocument: Document) {
      const selection = previewDocument.getSelection();

      return Boolean(
        selection &&
          selection.rangeCount > 0 &&
          selection.isCollapsed &&
          target.contains(selection.anchorNode)
      );
    },

    isPreviewEditableCaretAtStart(target: HTMLElement, previewDocument: Document) {
      if (!this.isPreviewEditableSelectionCollapsed(target, previewDocument)) {
        return false;
      }

      return this.getPreviewEditableTargetOffset(target, previewDocument) === 0;
    },

    isPreviewEditableCaretAtEnd(target: HTMLElement, previewDocument: Document) {
      if (!this.isPreviewEditableSelectionCollapsed(target, previewDocument)) {
        return false;
      }

      return (
        this.getPreviewEditableTargetOffset(target, previewDocument) >=
        this.getPreviewEditableTargetText(target).length
      );
    },

    mergePreviewTextBlock(
      node: HTMLElement,
      editableTarget: HTMLElement,
      previewDocument: Document,
      direction: "backward" | "forward"
    ) {
      const mergePreviewBlocks = this.findPreviewParentMethod("mergePreviewBlocks");

      if (!mergePreviewBlocks) {
        return false;
      }

      return Boolean(
        mergePreviewBlocks({
          headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
          blockIndex: Number(node.dataset.liaBlockIndex || -1),
          direction,
          currentText: this.getPreviewEditableTargetText(editableTarget),
        })
      );
    },

    getPreviewInlineBlockText(node: HTMLElement, previewDocument: Document) {
      const source = this.parsePreviewInlineBlockSource(this.getPreviewBlockSourceText(node, previewDocument));
      const paragraph = node.querySelector(":scope > p.lia-paragraph") as HTMLElement | null;

      if (!source || !paragraph) {
        return null;
      }

      let text = "";
      let tokenIndex = 0;

      Array.from(paragraph.childNodes).forEach((childNode) => {
        if (childNode.nodeType === previewDocument.TEXT_NODE) {
          return;
        }

        if (!(childNode instanceof previewDocument.defaultView!.HTMLElement)) {
          return;
        }

        if (childNode.tagName === "SPAN") {
          text += this.getPreviewInlineSegmentText(childNode);
          return;
        }

        if (childNode.tagName === "INPUT" && childNode.classList.contains("lia-input")) {
          text += source.tokens[tokenIndex] || "";
          tokenIndex += 1;
          return;
        }

        if (childNode.tagName === "BR") {
          text = this.appendPreviewInlineBreakText(text);
        }
      });

      if (tokenIndex !== source.tokens.length) {
        return null;
      }

      return text;
    },

    mergePreviewInlineBlock(
      node: HTMLElement,
      previewDocument: Document,
      direction: "backward" | "forward"
    ) {
      const mergePreviewBlocks = this.findPreviewParentMethod("mergePreviewBlocks");

      if (!mergePreviewBlocks) {
        return false;
      }

      const currentText = this.getPreviewInlineBlockText(node, previewDocument);

      if (currentText === null) {
        return false;
      }

      return Boolean(
        mergePreviewBlocks({
          headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
          blockIndex: Number(node.dataset.liaBlockIndex || -1),
          direction,
          currentText,
        })
      );
    },

    getPreviewInlineAdjacentElement(
      target: HTMLElement,
      direction: "backward" | "forward"
    ): HTMLElement | null {
      let sibling =
        direction === "backward" ? target.previousSibling : target.nextSibling;

      while (sibling) {
        if (sibling.nodeType === Node.TEXT_NODE) {
          if ((sibling.textContent || "").trim() === "") {
            sibling = direction === "backward" ? sibling.previousSibling : sibling.nextSibling;
            continue;
          }

          return null;
        }

        if (sibling instanceof target.ownerDocument.defaultView!.HTMLElement) {
          return sibling;
        }

        sibling = direction === "backward" ? sibling.previousSibling : sibling.nextSibling;
      }

      return null;
    },

    removePreviewInlineAdjacentBreak(
      target: HTMLElement,
      previewDocument: Document,
      direction: "backward" | "forward"
    ) {
      const adjacent = this.getPreviewInlineAdjacentElement(target, direction);

      if (!adjacent || adjacent.tagName !== "BR") {
        return false;
      }

      adjacent.remove();

      const previewWindow = previewDocument.defaultView;
      if (previewWindow?.requestAnimationFrame) {
        previewWindow.requestAnimationFrame(() => {
          this.focusPreviewEditableTargetAt(target, previewDocument, direction === "backward");
        });
      } else {
        this.focusPreviewEditableTargetAt(target, previewDocument, direction === "backward");
      }

      return true;
    },

    isPreviewInlineBlockBoundaryTarget(
      target: HTMLElement,
      direction: "backward" | "forward"
    ) {
      let adjacent = this.getPreviewInlineAdjacentElement(target, direction);

      while (adjacent && adjacent.tagName === "BR") {
        adjacent = this.getPreviewInlineAdjacentElement(adjacent, direction) as HTMLElement | null;
      }

      if (!adjacent) {
        return true;
      }

      if (
        adjacent.tagName === "SPAN" &&
        adjacent.dataset.liaPreviewSyntheticTail === "true" &&
        direction === "forward"
      ) {
        return true;
      }

      return false;
    },

    insertPreviewInlineBreak(
      node: HTMLElement,
      target: HTMLElement,
      previewDocument: Document,
      targets: HTMLElement[]
    ) {
      const offset = this.getPreviewEditableTargetOffset(target, previewDocument);
      const originalText = this.getPreviewInlineSegmentText(target);

      if (!originalText) {
        const br = this.markPreviewInlineGeneratedNode(previewDocument.createElement("br"));
        target.insertAdjacentElement("beforebegin", br);
        this.focusPreviewEditableTargetAt(target, previewDocument, true);
        return;
      }

      if (offset <= 0) {
        const br = this.markPreviewInlineGeneratedNode(previewDocument.createElement("br"));
        target.insertAdjacentElement("beforebegin", br);
        this.focusPreviewEditableTargetAt(target, previewDocument, true);
        return;
      }

      const beforeText = originalText.slice(0, offset);
      const afterText = originalText.slice(offset);
      const nextTarget = previewDocument.createElement("span");
      const targetIndex = targets.indexOf(target);

      target.textContent = beforeText;

      const br = this.markPreviewInlineGeneratedNode(previewDocument.createElement("br"));
      target.insertAdjacentElement("afterend", br);
      br.insertAdjacentElement("afterend", nextTarget);

      if (targetIndex >= 0) {
        targets.splice(targetIndex + 1, 0, nextTarget);
      } else {
        targets.push(nextTarget);
      }

      this.markPreviewInlineGeneratedNode(nextTarget);
      nextTarget.textContent = afterText || (nextTarget.dataset.liaPreviewSyntheticTail === "true" ? "" : "\u200b");
      this.bindPreviewInlineEditableTarget(node, nextTarget, previewDocument, targets);
      this.focusPreviewEditableTargetAt(nextTarget, previewDocument, true);
    },

    insertPreviewInlineParagraphBreak(
      node: HTMLElement,
      target: HTMLElement,
      previewDocument: Document
    ) {
      const paragraph = node.querySelector(":scope > p.lia-paragraph") as HTMLElement | null;
      const source = this.parsePreviewInlineBlockSource(this.getPreviewBlockSourceText(node, previewDocument));

      if (!paragraph || !source) {
        return false;
      }

      const splitOffset = this.getPreviewEditableTargetOffset(target, previewDocument);
      let beforeText = "";
      let afterText = "";
      let tokenIndex = 0;
      let splitOccurred = false;

      Array.from(paragraph.childNodes).forEach((childNode) => {
        if (childNode.nodeType === previewDocument.TEXT_NODE) {
          return;
        }

        if (!(childNode instanceof previewDocument.defaultView!.HTMLElement)) {
          return;
        }

        if (childNode.tagName === "SPAN") {
          const value = this.getPreviewInlineSegmentText(childNode);

          if (childNode === target) {
            beforeText += value.slice(0, splitOffset);
            afterText += value.slice(splitOffset);
            splitOccurred = true;
            return;
          }

          if (splitOccurred) {
            afterText += value;
          } else {
            beforeText += value;
          }

          return;
        }

        if (childNode.tagName === "INPUT" && childNode.classList.contains("lia-input")) {
          const token = source.tokens[tokenIndex] || "";
          tokenIndex += 1;

          if (splitOccurred) {
            afterText += token;
          } else {
            beforeText += token;
          }

          return;
        }

        if (childNode.tagName === "BR") {
          if (splitOccurred) {
            afterText = this.appendPreviewInlineBreakText(afterText);
          } else {
            beforeText = this.appendPreviewInlineBreakText(beforeText);
          }
        }
      });

      if (!splitOccurred || tokenIndex !== source.tokens.length) {
        return false;
      }

      const editPreviewText = this.findPreviewParentMethod("editPreviewText");

      if (!editPreviewText) {
        return false;
      }

      return Boolean(
        editPreviewText({
          headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
          blockIndex: Number(node.dataset.liaBlockIndex || -1),
          text: `${beforeText}\n\n${afterText}`,
        })
      );
    },

    splitPreviewInlineBlock(
      node: HTMLElement,
      target: HTMLElement,
      previewDocument: Document,
      targets: HTMLElement[]
    ) {
      const paragraph = node.querySelector(":scope > p.lia-paragraph") as HTMLElement | null;
      const source = this.parsePreviewInlineBlockSource(this.getPreviewBlockSourceText(node, previewDocument));

      if (!paragraph || !source) {
        return false;
      }

      const splitOffset = this.getPreviewEditableTargetOffset(target, previewDocument);
      let beforeText = "";
      let afterText = "";
      let tokenIndex = 0;
      let splitOccurred = false;

      Array.from(paragraph.childNodes).forEach((childNode) => {
        if (childNode.nodeType === previewDocument.TEXT_NODE) {
          return;
        }

        if (!(childNode instanceof previewDocument.defaultView!.HTMLElement)) {
          return;
        }

        if (childNode.tagName === "SPAN") {
          const value = this.getPreviewInlineSegmentText(childNode);

          if (childNode === target) {
            beforeText += value.slice(0, splitOffset);
            afterText += value.slice(splitOffset);
            splitOccurred = true;
            return;
          }

          if (splitOccurred) {
            afterText += value;
          } else {
            beforeText += value;
          }

          return;
        }

        if (childNode.tagName === "INPUT" && childNode.classList.contains("lia-input")) {
          const token = source.tokens[tokenIndex] || "";
          tokenIndex += 1;

          if (splitOccurred) {
            afterText += token;
          } else {
            beforeText += token;
          }

          return;
        }

        if (childNode.tagName === "BR") {
          if (splitOccurred) {
            afterText += "\n<br>\n";
          } else {
            beforeText += "\n<br>\n";
          }
        }
      });

      if (!splitOccurred || tokenIndex !== source.tokens.length) {
        return false;
      }

      const splitPreviewBlock = this.findPreviewParentMethod("splitPreviewBlock");

      if (!splitPreviewBlock) {
        return false;
      }

      return Boolean(
        splitPreviewBlock({
          headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
          blockIndex: Number(node.dataset.liaBlockIndex || -1),
          beforeText,
          afterText,
        })
      );
    },

    bindPreviewInlineEditableTarget(
      node: HTMLElement,
      target: HTMLElement,
      previewDocument: Document,
      inlineEditableTargets: HTMLElement[]
    ) {
      target.dataset.liaPreviewEditable = "true";
      target.dataset.liaPreviewInlineSegmentIndex = String(inlineEditableTargets.indexOf(target));
      target.dataset.liaPreviewOriginalText = this.getPreviewInlineSegmentText(target);

      if (target.dataset.liaPreviewEditBound === "true") {
        return;
      }

      target.setAttribute("contenteditable", "true");
      target.setAttribute("tabindex", "0");
      target.setAttribute("role", "textbox");
      target.style.userSelect = "text";
      target.style.webkitUserSelect = "text";
      target.style.pointerEvents = "auto";
      if (target.dataset.liaPreviewSyntheticTail === "true") {
        target.style.display = "inline-block";
        target.style.minWidth = "0.75ch";
      }
      target.setAttribute("spellcheck", "false");

      const keepEditLocal = (event: Event) => {
        node.draggable = false;
        node.removeAttribute("data-lia-block-drag-hover");
        node.removeAttribute("data-lia-block-drag-armed");
        event.stopPropagation();
      };

      target.addEventListener("pointerdown", keepEditLocal);

      target.addEventListener("mousedown", keepEditLocal);

      target.addEventListener("click", (event) => {
        keepEditLocal(event);

        const mouseEvent = event as MouseEvent;

        if (this.placePreviewCaretFromPoint(target, previewDocument, mouseEvent.clientX, mouseEvent.clientY)) {
          return;
        }

        if (this.previewSelectionIsInsideTarget(target, previewDocument)) {
          return;
        }

        const previewWindow = previewDocument.defaultView;

        if (previewWindow?.requestAnimationFrame) {
          previewWindow.requestAnimationFrame(() => {
            this.focusPreviewEditableTarget(target, previewDocument);
            this.syncPreviewInlineSelection(node, target, previewDocument, inlineEditableTargets);
          });
        } else {
          this.focusPreviewEditableTarget(target, previewDocument);
          this.syncPreviewInlineSelection(node, target, previewDocument, inlineEditableTargets);
        }
      });

      target.addEventListener("mouseup", () => {
        this.syncPreviewInlineSelection(node, target, previewDocument, inlineEditableTargets);
      });

      target.addEventListener("keyup", () => {
        this.syncPreviewInlineSelection(node, target, previewDocument, inlineEditableTargets);
      });

      target.addEventListener("focus", () => {
        if (target.dataset.liaPreviewSyntheticTail === "true" && target.textContent === "\u200b") {
          target.textContent = "";
        }

        target.dataset.liaPreviewOriginalText = this.getPreviewInlineSegmentText(target);
        this.syncPreviewInlineSelection(node, target, previewDocument, inlineEditableTargets);
      });

      target.addEventListener("keydown", (event) => {
        event.stopPropagation();

        if (event.key === "Escape") {
          event.preventDefault();
          target.textContent = target.dataset.liaPreviewOriginalText || "";
          target.blur();
          return;
        }

        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (this.insertPreviewInlineParagraphBreak(node, target, previewDocument)) {
            target.dataset.liaPreviewSkipBlurCommit = "true";
          }
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          this.insertPreviewInlineBreak(node, target, previewDocument, inlineEditableTargets);
          return;
        }

        if (
          event.key === "Backspace" &&
          this.isPreviewEditableCaretAtStart(target, previewDocument)
        ) {
          event.preventDefault();

          if (this.removePreviewInlineAdjacentBreak(target, previewDocument, "backward")) {
            return;
          }

          if (!this.isPreviewInlineBlockBoundaryTarget(target, "backward")) {
            return;
          }

          target.dataset.liaPreviewSkipBlurCommit = "true";
          this.mergePreviewInlineBlock(node, previewDocument, "backward");
          return;
        }

        if (
          event.key === "Delete" &&
          this.isPreviewEditableCaretAtEnd(target, previewDocument)
        ) {
          event.preventDefault();

          if (this.removePreviewInlineAdjacentBreak(target, previewDocument, "forward")) {
            return;
          }

          if (!this.isPreviewInlineBlockBoundaryTarget(target, "forward")) {
            return;
          }

          target.dataset.liaPreviewSkipBlurCommit = "true";
          this.mergePreviewInlineBlock(node, previewDocument, "forward");
        }
      });

      target.addEventListener("blur", (event) => {
        if (target.dataset.liaPreviewSkipBlurCommit === "true") {
          delete target.dataset.liaPreviewSkipBlurCommit;
          this.resetPreviewSyntheticTailTarget(target);
          return;
        }

        const nextTarget = event.relatedTarget as HTMLElement | null;

        if (
          nextTarget &&
          nextTarget !== target &&
          node.contains(nextTarget) &&
          nextTarget.getAttribute("data-lia-preview-editable") === "true"
        ) {
          this.resetPreviewSyntheticTailTarget(target);
          return;
        }

        const changed = this.commitPreviewInlineSegments(node, previewDocument, inlineEditableTargets);

        if (!changed) {
          target.textContent = target.dataset.liaPreviewOriginalText || target.textContent || "";
        }

        this.resetPreviewSyntheticTailTarget(target);
      });

      target.dataset.liaPreviewEditBound = "true";
    },

    commitPreviewTextEdit(node: HTMLElement, previewDocument: Document) {
      const editableTarget = this.getPreviewEditableTextTarget(node, previewDocument);

      if (!editableTarget) {
        return false;
      }

      const originalText = editableTarget.dataset.liaPreviewOriginalText || "";
      const nextText = this.normalizePreviewEditableText(
        editableTarget.innerText || editableTarget.textContent || ""
      );
      const formattedSource = this.parsePreviewFormattedBlockSource(
        this.getPreviewBlockSourceText(node, previewDocument)
      );
      const sourcePrefix = editableTarget.dataset.liaPreviewSourcePrefix || formattedSource?.prefix || "";
      const sourceSuffix = editableTarget.dataset.liaPreviewSourceSuffix || formattedSource?.suffix || "";

      if (nextText === originalText) {
        editableTarget.textContent = originalText;
        return false;
      }

      const payload = {
        headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
        blockIndex: Number(node.dataset.liaBlockIndex || -1),
        text: `${sourcePrefix}${nextText}${sourceSuffix}`,
      };
      const parent = this.$parent as any;
      const changed =
        typeof parent?.editPreviewText === "function"
          ? parent.editPreviewText(payload)
          : (this.$emit("editText", payload), true);

      if (!changed) {
        editableTarget.textContent = originalText;
        return false;
      }

      editableTarget.dataset.liaPreviewOriginalText = nextText;
      return true;
    },

    getPreviewBlockSourceText(node: HTMLElement, previewDocument: Document) {
      const payload = {
        headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
        blockIndex: Number(node.dataset.liaBlockIndex || -1),
      };
      const getPreviewBlockSource = this.findPreviewParentMethod("getPreviewBlockSource");
      const getPreviewBlockText = this.findPreviewParentMethod("getPreviewBlockText");

      if (getPreviewBlockSource) {
        return getPreviewBlockSource(payload);
      }

      if (getPreviewBlockText) {
        return getPreviewBlockText(payload);
      }

      return null;
    },

    getPreviewInlineSegments(node: HTMLElement, previewDocument: Document) {
      const payload = {
        headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
        blockIndex: Number(node.dataset.liaBlockIndex || -1),
      };
      const getPreviewInlineTextSegments = this.findPreviewParentMethod("getPreviewInlineTextSegments");

      if (getPreviewInlineTextSegments) {
        return getPreviewInlineTextSegments(payload);
      }

      return null;
    },

    parsePreviewInlineBlockSource(sourceText: string | null) {
      if (!sourceText) {
        return null;
      }

      const tokenPattern = /(\[\[[^\]]*\]\])/g;
      const parts = sourceText.split(tokenPattern);
      const tokens: string[] = [];
      const textFragments: string[] = [];

      parts.forEach((part, index) => {
        if (index % 2 === 0) {
          textFragments.push(part);
        } else {
          tokens.push(part);
        }
      });

      if (!tokens.length || textFragments.length !== tokens.length + 1) {
        return null;
      }

      return {
        tokens,
        textFragments,
      };
    },

    getPreviewVisibleInlineFragmentText(fragment: string) {
      return fragment.replace(/\r/g, "").replace(/\s*<br>\s*/g, "").replace(/[\n]+/g, "");
    },

    splitPreviewInlineEditableFragment(fragment: string) {
      const match = fragment.match(/^([\s\S]*<br>\s*)([\s\S]*)$/);

      if (match) {
        return {
          prefix: match[1] || "",
          editableText: match[2] || "",
        };
      }

      return {
        prefix: "",
        editableText: fragment,
      };
    },

    getPreviewInlineEditableFragmentMappings(sourceText: string | null) {
      const parsed = this.parsePreviewInlineBlockSource(sourceText);

      if (!parsed) {
        return null;
      }

      const mappings = parsed.textFragments
        .map((fragment, fragmentIndex) => {
          const split = this.splitPreviewInlineEditableFragment(fragment);

          return {
            fragmentIndex,
            prefix: split.prefix,
            editableText: split.editableText,
            visibleText: this.getPreviewVisibleInlineFragmentText(split.editableText),
          };
        })
        .filter((mapping) => mapping.visibleText.length > 0);

      return {
        ...parsed,
        mappings,
      };
    },

    commitPreviewInlineSegments(node: HTMLElement, previewDocument: Document, targets: HTMLElement[]) {
      const source = this.parsePreviewInlineBlockSource(this.getPreviewBlockSourceText(node, previewDocument));
      const paragraph = node.querySelector(":scope > p.lia-paragraph") as HTMLElement | null;

      if (!source || !paragraph) {
        return false;
      }

      let text = "";
      let tokenIndex = 0;

      Array.from(paragraph.childNodes).forEach((childNode) => {
        if (childNode.nodeType === previewDocument.TEXT_NODE) {
          return;
        }

        if (!(childNode instanceof previewDocument.defaultView!.HTMLElement)) {
          return;
        }

        if (childNode.tagName === "SPAN") {
          text += this.getPreviewInlineSegmentText(childNode);
          return;
        }

        if (childNode.tagName === "INPUT" && childNode.classList.contains("lia-input")) {
          text += source.tokens[tokenIndex] || "";
          tokenIndex += 1;
          return;
        }

        if (childNode.tagName === "BR") {
          text = this.appendPreviewInlineBreakText(text);
        }
      });

      if (!text || tokenIndex !== source.tokens.length) {
        return false;
      }

      const payload = {
        headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
        blockIndex: Number(node.dataset.liaBlockIndex || -1),
        text,
      };
      const editPreviewText = this.findPreviewParentMethod("editPreviewText");

      if (!editPreviewText) {
        return false;
      }

      return Boolean(editPreviewText(payload));
    },

    getPreviewInlineEditableTargets(node: HTMLElement, previewDocument: Document) {
      const paragraph = node.querySelector(":scope > p.lia-paragraph") as HTMLElement | null;

      if (!paragraph || !paragraph.querySelector("input.lia-input")) {
        return null;
      }

      this.ensurePreviewEditableOutsideBlur(previewDocument);

      this.cleanupPreviewInlineGeneratedNodes(paragraph);

      const spans = Array.from(paragraph.querySelectorAll(":scope > span")) as HTMLElement[];
      const inlineSegments = this.parsePreviewInlineBlockSource(this.getPreviewBlockSourceText(node, previewDocument));
      const inputCount = paragraph.querySelectorAll(":scope > input.lia-input").length;

      if (!inlineSegments || inputCount !== inlineSegments.tokens.length) {
        return null;
      }

      this.ensurePreviewInlineTailTarget(paragraph, inlineSegments);

      const nextSpans = Array.from(paragraph.querySelectorAll(":scope > span")) as HTMLElement[];

      if (!nextSpans.length) {
        return null;
      }

      return nextSpans;
    },

    openPreviewBlockSourceEditor(node: HTMLElement, previewDocument: Document) {
      if (node.dataset.liaPreviewBlockEditorOpen === "true") {
        node.querySelector(":scope > .lia-preview-block__editor")?.focus();
        return;
      }

      const sourceText = this.getPreviewBlockSourceText(node, previewDocument);

      if (!sourceText) {
        return;
      }

      const editor = previewDocument.createElement("textarea");
      editor.className = "lia-preview-block__editor";
      editor.value = sourceText;
      editor.setAttribute("spellcheck", "false");
      editor.dataset.liaPreviewOriginalText = sourceText;

      const saveAndClose = () => {
        const nextText = this.normalizePreviewEditableText(editor.value || "");
        const changed =
          nextText !== editor.dataset.liaPreviewOriginalText &&
          this.commitPreviewBlockSourceEdit(node, previewDocument, nextText);

        if (!changed) {
          editor.value = editor.dataset.liaPreviewOriginalText || editor.value;
        }

        editor.remove();
        node.removeAttribute("data-lia-preview-block-editor-open");
      };

      editor.addEventListener("keydown", (event) => {
        event.stopPropagation();

        if (event.key === "Escape") {
          event.preventDefault();
          editor.value = editor.dataset.liaPreviewOriginalText || editor.value;
          editor.remove();
          node.removeAttribute("data-lia-preview-block-editor-open");
          return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          editor.blur();
        }
      });

      editor.addEventListener("blur", saveAndClose);

      node.dataset.liaPreviewBlockEditorOpen = "true";
      node.appendChild(editor);
      editor.focus();
      editor.setSelectionRange(editor.value.length, editor.value.length);
    },

    commitPreviewBlockSourceEdit(node: HTMLElement, previewDocument: Document, text: string) {
      const payload = {
        headingText: (previewDocument.querySelector("main > header")?.textContent || "").trim(),
        blockIndex: Number(node.dataset.liaBlockIndex || -1),
        text,
      };
      const parent = this.$parent as any;
      const changed =
        typeof parent?.editPreviewBlockSource === "function"
          ? parent.editPreviewBlockSource(payload)
          : typeof parent?.editPreviewText === "function"
          ? parent.editPreviewText(payload)
          : (this.$emit("editText", payload), true);

      return Boolean(changed);
    },

    parsePreviewQuizSettings(sourceText: string | null) {
      const result = {
        showPartialSolution: false,
        solutionButton: "",
        quizContent: "",
        mathEnabled: false,
        bodyLines: [] as string[],
        leadingLines: [] as string[],
      };

      if (!sourceText) {
        return result;
      }

      const lines = sourceText.replace(/\r/g, "").split("\n");
      let index = 0;

      while (index < lines.length && /^\s*<!--.*-->\s*$/.test(lines[index])) {
        const line = lines[index];
        let handled = false;

        if (/data-show-partial-solution/.test(line)) {
          result.showPartialSolution = true;
          handled = true;
        }

        const solutionMatch = line.match(/data-solution-button="([^"]+)"/);
        if (solutionMatch) {
          result.solutionButton = solutionMatch[1];
          handled = true;
        }

        if (!handled) {
          result.leadingLines.push(line);
        }

        index += 1;
      }

      result.bodyLines = lines.slice(index);

      const bodyText = result.bodyLines.join("\n");
      const quizContentMatch = bodyText.match(/\[\[\s*([\s\S]*?)\s*\]\]/);
      const mathMatch = bodyText.match(/^\s*@Algebrite\.check\((.*)\)\s*$/m);

      if (quizContentMatch) {
        result.quizContent = quizContentMatch[1];
      }

      if (mathMatch) {
        result.mathEnabled = true;
      }

      return result;
    },

    buildPreviewQuizSettingsComment(showPartialSolution: boolean, solutionButton: string) {
      const trimmedSolutionButton = solutionButton.trim();

      if (showPartialSolution && trimmedSolutionButton) {
        return `<!-- data-show-partial-solution  data-solution-button="${trimmedSolutionButton}"  -->`;
      }

      if (showPartialSolution) {
        return "<!-- data-show-partial-solution -->";
      }

      if (trimmedSolutionButton) {
        return `<!--  data-solution-button="${trimmedSolutionButton}"  -->`;
      }

      return "";
    },

    updatePreviewQuizSettings(node: HTMLElement, previewDocument: Document, settings: { showPartialSolution: boolean; solutionButton: string; quizContent: string; mathEnabled: boolean; }) {
      const sourceText = this.getPreviewBlockSourceText(node, previewDocument);
      const parsed = this.parsePreviewQuizSettings(sourceText);
      const comment = this.buildPreviewQuizSettingsComment(
        settings.showPartialSolution,
        settings.solutionButton
      );
      const trimmedQuizContent = settings.quizContent.trim();
      let nextBodyText = parsed.bodyLines
        .join("\n")
        .replace(/\[\[[\s\S]*?\]\]/, `[[ ${trimmedQuizContent} ]]`);
      nextBodyText = nextBodyText
        .replace(/^\s*@Algebrite\.check\((.*)\)\s*$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trimEnd();

      if (settings.mathEnabled) {
        nextBodyText = `${nextBodyText}\n@Algebrite.check(${trimmedQuizContent})`;
      }

      const nextLines = [...parsed.leadingLines];

      if (comment) {
        nextLines.push(comment);
      }

      nextLines.push(...nextBodyText.split("\n"));
      const blockChanged = this.commitPreviewBlockSourceEdit(node, previewDocument, nextLines.join("\n"));
      const updatePreviewHeaderImport = this.findPreviewParentMethod("updatePreviewHeaderImport");

      if (updatePreviewHeaderImport && settings.mathEnabled) {
        updatePreviewHeaderImport({
          importLine: "import: https://raw.githubusercontent.com/liaTemplates/algebrite/master/README.md",
          enabled: true,
        });
      }

      return blockChanged;
    },

    hidePreviewQuizSettingsOverlay(previewDocument: Document) {
      const overlay = previewDocument.getElementById("lia-preview-quiz-settings") as HTMLElement | null;

      if (!overlay) {
        return;
      }

      overlay.hidden = true;
      delete overlay.dataset.liaPreviewQuizBlockIndex;
    },

    ensurePreviewQuizSettingsOverlay(previewDocument: Document) {
      let overlay = previewDocument.getElementById("lia-preview-quiz-settings") as HTMLElement | null;

      if (overlay) {
        return overlay;
      }

      overlay = previewDocument.createElement("div");
      overlay.id = "lia-preview-quiz-settings";
      overlay.className = "lia-preview-quiz-settings";
      overlay.hidden = true;
      overlay.innerHTML = [
        '<label class="lia-preview-quiz-settings__row">',
        '  <input class="lia-preview-quiz-settings__checkbox" type="checkbox" data-lia-preview-quiz-field="partial" />',
        '  <span class="lia-preview-quiz-settings__label">Partial Solution</span>',
        '</label>',
        '<label class="lia-preview-quiz-settings__row">',
        '  <input class="lia-preview-quiz-settings__checkbox" type="checkbox" data-lia-preview-quiz-field="tries-enabled" />',
        '  <span class="lia-preview-quiz-settings__label">Tries</span>',
        '  <input class="lia-preview-quiz-settings__input lia-preview-quiz-settings__input--tries" type="number" min="1" step="1" data-lia-preview-quiz-field="tries" />',
        '</label>',
        '<label class="lia-preview-quiz-settings__stack">',
        '  <span class="lia-preview-quiz-settings__label">Quiz Content</span>',
        '  <input class="lia-preview-quiz-settings__input" type="text" data-lia-preview-quiz-field="content" placeholder="Text inside [[ ... ]]" />',
        '</label>',
        '<label class="lia-preview-quiz-settings__row">',
        '  <input class="lia-preview-quiz-settings__checkbox" type="checkbox" data-lia-preview-quiz-field="math" />',
        '  <span class="lia-preview-quiz-settings__label">Mathematik</span>',
        '</label>',
        '<div class="lia-preview-quiz-settings__actions">',
        '  <button type="button" class="lia-preview-quiz-settings__button" data-lia-preview-quiz-action="cancel">Close</button>',
        '  <button type="button" class="lia-preview-quiz-settings__button" data-lia-preview-quiz-action="apply">Apply</button>',
        '</div>',
      ].join("");

      overlay.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      overlay.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      const cancelButton = overlay.querySelector('[data-lia-preview-quiz-action="cancel"]') as HTMLButtonElement | null;
      cancelButton?.addEventListener("click", () => {
        this.hidePreviewQuizSettingsOverlay(previewDocument);
      });

      const applyButton = overlay.querySelector('[data-lia-preview-quiz-action="apply"]') as HTMLButtonElement | null;
      applyButton?.addEventListener("click", () => {
        const blockIndex = Number(overlay?.dataset.liaPreviewQuizBlockIndex || -1);
        const node = previewDocument.querySelector(
          `.lia-preview-block[data-lia-block-index="${blockIndex}"]`
        ) as HTMLElement | null;
        const partialInput = overlay?.querySelector('[data-lia-preview-quiz-field="partial"]') as HTMLInputElement | null;
        const triesEnabledInput = overlay?.querySelector('[data-lia-preview-quiz-field="tries-enabled"]') as HTMLInputElement | null;
        const triesInput = overlay?.querySelector('[data-lia-preview-quiz-field="tries"]') as HTMLInputElement | null;
        const contentInput = overlay?.querySelector('[data-lia-preview-quiz-field="content"]') as HTMLInputElement | null;
        const mathInput = overlay?.querySelector('[data-lia-preview-quiz-field="math"]') as HTMLInputElement | null;

        if (!node || !partialInput || !triesEnabledInput || !triesInput || !contentInput || !mathInput) {
          return;
        }

        this.updatePreviewQuizSettings(node, previewDocument, {
          showPartialSolution: partialInput.checked,
          solutionButton: triesEnabledInput.checked ? triesInput.value : "",
          quizContent: contentInput.value,
          mathEnabled: mathInput.checked,
        });

        this.hidePreviewQuizSettingsOverlay(previewDocument);
      });

      const triesEnabledInput = overlay.querySelector('[data-lia-preview-quiz-field="tries-enabled"]') as HTMLInputElement | null;
      const triesInput = overlay.querySelector('[data-lia-preview-quiz-field="tries"]') as HTMLInputElement | null;
      triesEnabledInput?.addEventListener("change", () => {
        if (!triesInput) {
          return;
        }

        triesInput.disabled = !triesEnabledInput.checked;

        if (!triesEnabledInput.checked) {
          triesInput.value = "";
        }
      });

      previewDocument.addEventListener("pointerdown", (event) => {
        if (!overlay || overlay.hidden) {
          return;
        }

        if (!overlay.contains(event.target as Node)) {
          this.hidePreviewQuizSettingsOverlay(previewDocument);
        }
      }, true);

      previewDocument.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.hidePreviewQuizSettingsOverlay(previewDocument);
        }
      });

      previewDocument.body.appendChild(overlay);
      return overlay;
    },

    openPreviewQuizSettingsOverlay(node: HTMLElement, previewDocument: Document, clientX: number, clientY: number) {
      const sourceText = this.getPreviewBlockSourceText(node, previewDocument);
      const settings = this.parsePreviewQuizSettings(sourceText);
      const overlay = this.ensurePreviewQuizSettingsOverlay(previewDocument);
      const partialInput = overlay.querySelector('[data-lia-preview-quiz-field="partial"]') as HTMLInputElement | null;
      const triesEnabledInput = overlay.querySelector('[data-lia-preview-quiz-field="tries-enabled"]') as HTMLInputElement | null;
      const triesInput = overlay.querySelector('[data-lia-preview-quiz-field="tries"]') as HTMLInputElement | null;
      const contentInput = overlay.querySelector('[data-lia-preview-quiz-field="content"]') as HTMLInputElement | null;
      const mathInput = overlay.querySelector('[data-lia-preview-quiz-field="math"]') as HTMLInputElement | null;

      if (!partialInput || !triesEnabledInput || !triesInput || !contentInput || !mathInput) {
        return;
      }

      overlay.dataset.liaPreviewQuizBlockIndex = String(node.dataset.liaBlockIndex || "");
      partialInput.checked = settings.showPartialSolution;
      triesEnabledInput.checked = Boolean(settings.solutionButton);
      triesInput.disabled = !triesEnabledInput.checked;
      triesInput.value = settings.solutionButton;
      contentInput.value = settings.quizContent;
      mathInput.checked = settings.mathEnabled;
      overlay.hidden = false;

      const maxLeft = Math.max(8, previewDocument.defaultView!.innerWidth - overlay.offsetWidth - 8);
      const maxTop = Math.max(8, previewDocument.defaultView!.innerHeight - overlay.offsetHeight - 8);
      overlay.style.left = `${Math.min(clientX, maxLeft)}px`;
      overlay.style.top = `${Math.min(clientY, maxTop)}px`;
    },

    shouldUsePreviewBlockSourceEditor(node: HTMLElement) {
      return Boolean(node.querySelector(":scope > p .lia-input, :scope > .lia-quiz, :scope > input.lia-input"));
    },

    isPreviewBlockDragEdge(node: HTMLElement, clientX: number, clientY: number) {
      const rect = node.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const offsetY = clientY - rect.top;
      const threshold = 16;

      if (offsetX < 0 || offsetY < 0 || offsetX > rect.width || offsetY > rect.height) {
        return false;
      }

      return (
        offsetX <= threshold ||
        offsetX >= rect.width - threshold ||
        offsetY <= threshold ||
        offsetY >= rect.height - threshold
      );
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

      previewRoot
        ?.querySelectorAll(".lia-preview-block[data-lia-block-drag-hover]")
        .forEach((node) => node.removeAttribute("data-lia-block-drag-hover"));

      this.clearPreviewBlockDropPreview(previewRoot || undefined);
    },

    bindPreviewPlainEditableTarget(node: HTMLElement, editableTarget: HTMLElement, previewDocument: Document) {
      editableTarget.dataset.liaPreviewEditable = "true";
      editableTarget.dataset.liaPreviewOriginalText = this.normalizePreviewEditableText(
        editableTarget.innerText || editableTarget.textContent || ""
      );

      if (editableTarget.dataset.liaPreviewEditBound === "true") {
        return;
      }

      editableTarget.setAttribute("contenteditable", "true");
      editableTarget.setAttribute("tabindex", "0");
      editableTarget.setAttribute("role", "textbox");
      editableTarget.style.userSelect = "text";
      editableTarget.style.webkitUserSelect = "text";
      editableTarget.style.pointerEvents = "auto";
      editableTarget.setAttribute("spellcheck", "false");

      const keepEditLocal = (event: Event) => {
        node.draggable = false;
        node.removeAttribute("data-lia-block-drag-hover");
        node.removeAttribute("data-lia-block-drag-armed");
        event.stopPropagation();
      };

      editableTarget.addEventListener("pointerdown", keepEditLocal);
      editableTarget.addEventListener("mousedown", keepEditLocal);
      editableTarget.addEventListener("click", (event) => {
        keepEditLocal(event);

        const mouseEvent = event as MouseEvent;

        if (
          this.placePreviewCaretFromPoint(
            editableTarget,
            previewDocument,
            mouseEvent.clientX,
            mouseEvent.clientY
          )
        ) {
          return;
        }

        if (this.previewSelectionIsInsideTarget(editableTarget, previewDocument)) {
          this.syncPreviewTextSelection(node, editableTarget, previewDocument);
          return;
        }

        this.focusPreviewEditableTarget(editableTarget, previewDocument);
        this.syncPreviewTextSelection(node, editableTarget, previewDocument);
      });

      editableTarget.addEventListener("mouseup", () => {
        this.syncPreviewTextSelection(node, editableTarget, previewDocument);
      });

      editableTarget.addEventListener("keyup", () => {
        this.syncPreviewTextSelection(node, editableTarget, previewDocument);
      });

      editableTarget.addEventListener("paste", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const pastedText = event.clipboardData?.getData("text/plain") || "";
        this.insertPlainTextIntoPreviewTarget(editableTarget, pastedText, previewDocument);
      });

      editableTarget.addEventListener("focus", () => {
        editableTarget.dataset.liaPreviewOriginalText = this.normalizePreviewEditableText(
          editableTarget.innerText || editableTarget.textContent || ""
        );
        node.draggable = false;
        node.removeAttribute("data-lia-block-drag-hover");
        node.removeAttribute("data-lia-block-drag-armed");
        this.syncPreviewTextSelection(node, editableTarget, previewDocument);
      });

      editableTarget.addEventListener("keydown", (event) => {
        event.stopPropagation();

        if (event.key === "Escape") {
          event.preventDefault();
          editableTarget.textContent = editableTarget.dataset.liaPreviewOriginalText || "";
          editableTarget.blur();
          return;
        }

        if (event.key === "Backspace" && this.isPreviewEditableCaretAtStart(editableTarget, previewDocument)) {
          event.preventDefault();
          editableTarget.dataset.liaPreviewSkipBlurCommit = "true";
          this.mergePreviewTextBlock(node, editableTarget, previewDocument, "backward");
          return;
        }

        if (event.key === "Delete" && this.isPreviewEditableCaretAtEnd(editableTarget, previewDocument)) {
          event.preventDefault();
          editableTarget.dataset.liaPreviewSkipBlurCommit = "true";
          this.mergePreviewTextBlock(node, editableTarget, previewDocument, "forward");
        }
      });

      editableTarget.addEventListener("blur", () => {
        if (editableTarget.dataset.liaPreviewSkipBlurCommit === "true") {
          delete editableTarget.dataset.liaPreviewSkipBlurCommit;
          return;
        }

        this.commitPreviewTextEdit(node, previewDocument);
      });

      editableTarget.dataset.liaPreviewEditBound = "true";
    },

    bindPreviewBlockInteractions() {
      const iframe = document.getElementById("liascript-preview") as HTMLIFrameElement | null;
      const previewDocument = iframe?.contentDocument;
      const main = previewDocument?.querySelector("main");

      if (!previewDocument?.body || !main) {
        return;
      }

      this.bindPreviewInsertZones(previewDocument, main as HTMLElement);

      Array.from(main.querySelectorAll(":scope > .lia-preview-block")).forEach((node) => {
        if (!(node instanceof iframe.contentWindow!.HTMLElement)) {
          return;
        }

        if (node.dataset.liaBlockReorderBound === "true") {
          node.draggable = false;
        } else {
          node.draggable = false;

          const armDrag = (event: MouseEvent | PointerEvent) => {
            const enabled = this.isPreviewBlockDragEdge(node, event.clientX, event.clientY);

            node.draggable = enabled;

            if (enabled) {
              node.dataset.liaBlockDragArmed = "true";
            } else {
              node.removeAttribute("data-lia-block-drag-armed");
            }
          };

          const updateHoverState = (event: MouseEvent | PointerEvent) => {
            if (this.isPreviewBlockDragEdge(node, event.clientX, event.clientY)) {
              node.dataset.liaBlockDragHover = "true";
            } else {
              node.removeAttribute("data-lia-block-drag-hover");
            }
          };

          node.addEventListener("pointermove", updateHoverState);
          node.addEventListener("mousemove", updateHoverState);
          node.addEventListener("pointerdown", armDrag);
          node.addEventListener("mousedown", armDrag);

          node.addEventListener("pointerleave", () => {
            if (!node.hasAttribute("data-lia-block-dragging")) {
              node.removeAttribute("data-lia-block-drag-hover");
            }
          });

          node.addEventListener("mouseleave", () => {
            if (!node.hasAttribute("data-lia-block-dragging")) {
              node.removeAttribute("data-lia-block-drag-hover");
            }
          });

          node.addEventListener("pointerup", () => {
            if (!node.hasAttribute("data-lia-block-dragging")) {
              node.draggable = false;
              node.removeAttribute("data-lia-block-drag-armed");
            }
          });

          node.addEventListener("pointercancel", () => {
            if (!node.hasAttribute("data-lia-block-dragging")) {
              node.draggable = false;
              node.removeAttribute("data-lia-block-drag-armed");
            }
          });

          node.addEventListener("dragstart", (event) => {
            if (node.dataset.liaBlockDragArmed !== "true") {
              event.preventDefault();
              this.clearPreviewBlockDragState(previewDocument);
              node.draggable = false;
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
            node.draggable = false;
            node.removeAttribute("data-lia-block-drag-armed");
          });

          node.dataset.liaBlockReorderBound = "true";
        }

        const editableTarget = this.getPreviewEditableTextTarget(node, previewDocument);

        const inlineEditableTargets = this.getPreviewInlineEditableTargets(node, previewDocument);

        if (node.querySelector(":scope > .lia-quiz, :scope .lia-quiz")) {
          if (node.dataset.liaPreviewQuizSettingsBound !== "true") {
            node.addEventListener("contextmenu", (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.openPreviewQuizSettingsOverlay(node, previewDocument, event.clientX, event.clientY);
            });

            node.dataset.liaPreviewQuizSettingsBound = "true";
          }
        }

        if (inlineEditableTargets) {
          inlineEditableTargets.forEach((target, segmentIndex) => {
            target.dataset.liaPreviewInlineSegmentIndex = String(segmentIndex);
            this.bindPreviewInlineEditableTarget(node, target, previewDocument, inlineEditableTargets);
          });

          return;
        }

        if (!editableTarget && this.shouldUsePreviewBlockSourceEditor(node)) {
          if (node.dataset.liaPreviewBlockSourceEditBound === "true") {
            return;
          }

          const openSourceEditor = (event: Event) => {
            const target = event.target as HTMLElement | null;
            const formattedTarget = this.getPreviewFormattedEditableTarget(node, previewDocument);

            if (!target || target.closest("input, button, select, textarea, a")) {
              return;
            }

            if (formattedTarget) {
              event.stopPropagation();
              delete node.dataset.liaPreviewBlockSourceEditBound;
              this.bindPreviewPlainEditableTarget(node, formattedTarget, previewDocument);
              this.focusPreviewEditableTarget(formattedTarget, previewDocument);
              this.syncPreviewTextSelection(node, formattedTarget, previewDocument);
              return;
            }

            if (!target.closest("p, span, .lia-paragraph")) {
              return;
            }

            event.stopPropagation();
            this.openPreviewBlockSourceEditor(node, previewDocument);
          };

          node.addEventListener("click", openSourceEditor);

          Array.from(node.querySelectorAll(":scope > p, :scope > p span")).forEach((textNode) => {
            textNode.addEventListener("click", openSourceEditor);
          });

          node.dataset.liaPreviewBlockSourceEditBound = "true";
          return;
        }

        if (!editableTarget) {
          return;
        }
        this.bindPreviewPlainEditableTarget(node, editableTarget, previewDocument);
      });
    },

    decoratePreviewBlocks() {
      const iframe = document.getElementById("liascript-preview") as HTMLIFrameElement | null;
      const previewDocument = iframe?.contentDocument;
      const main = previewDocument?.querySelector("main");

      if (!previewDocument?.head || !main) {
        return;
      }

      let outlineStyle = previewDocument.getElementById("lia-preview-block-outline-style");

      if (!outlineStyle) {
        outlineStyle = previewDocument.createElement("style");
        outlineStyle.id = "lia-preview-block-outline-style";
        previewDocument.head.appendChild(outlineStyle);
      }

      outlineStyle.textContent = this.getPreviewBlockOutlineCss();

      Array.from(main.children).forEach((node) => {
        if (!(node instanceof iframe.contentWindow!.HTMLElement)) {
          return;
        }

        if (node.tagName === "HEADER") {
          node.classList.remove("lia-preview-block");
          node.removeAttribute("data-lia-block-index");
          return;
        }

        node.querySelector(":scope > .lia-preview-block__drag-handle")?.remove();

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
      this.focusPendingPreviewBlock(previewDocument, main as HTMLElement);

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

        this.sendToLia("eval", this.getPreviewInitCode());
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
  
  watch: {
    lights() {
      if (this.sendToLia) {
        this.sendToLia("eval", this.getPreviewInitCode());
      }

      this.decoratePreviewBlocks();
    },
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

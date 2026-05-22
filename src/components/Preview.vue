<script lang="ts">
const INIT_CODE = `
var blob = {};
var previewDragState = null;
var previewPointerDragState = null;
var previewReorderObserver = null;

window.normalizePreviewSource = function (src) {
  if (!src) {
    return ''
  }

  if (src.startsWith(window.location.origin + '/')) {
    return decodeURIComponent(src.slice(window.location.origin.length + 1))
  }

  return decodeURIComponent(src)
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
      responsiveVoiceKey: process.env.RESPONSIVEVOICE_KEY,
      sendToLia: null,
      origin: window.location.origin + window.location.pathname + "liascript/index.html?",
    };
  },

  methods: {
    onReady(params: any) {
      const iframe = document.getElementById("liascript-preview") as HTMLIFrameElement;

      if (!this.isReady && iframe && iframe.contentWindow) {
        this.isReady = true;

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
          "setTimeout(function(){ if (window.enablePreviewReorder) { window.enablePreviewReorder(); } }, 0)"
        );
      }

      if (params) {
        this.$emit("update", params);
      }
    },
  },

  mounted() {
    const iframe = document.getElementById("liascript-preview");

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
  <iframe id="liascript-preview" :src="origin" allow="autoplay"></iframe>
</template>

<style scoped>
#liascript-preview {
  height: 100%;
  width: 100%;
}
</style>

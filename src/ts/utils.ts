export const LiaScriptURL =
  process.env.LIASCRIPT || 'https://liascript.github.io/course/'

export const LiveEditorURL = window.location.origin + window.location.pathname

const NEW_COURSE_TEMPLATE = 'new-course-template'

export const CourseLanguages = [
  {
    value: 'am',
    label: 'Amharic',
    narrator: 'US English Female',
  },
  {
    value: 'ar',
    label: 'Arabic',
    narrator: 'Arabic Female',
  },
  {
    value: 'bg',
    label: 'Bulgarian',
    narrator: 'US English Female',
  },
  {
    value: 'bn',
    label: 'Bengali',
    narrator: 'Bangla India Female',
  },
  {
    value: 'de',
    label: 'Deutsch',
    narrator: 'Deutsch Female',
  },
  {
    value: 'en',
    label: 'English',
    narrator: 'US English Female',
  },
  {
    value: 'es',
    label: 'Spanish',
    narrator: 'Spanish Female',
  },
  {
    value: 'fa',
    label: 'Persian',
    narrator: 'Arabic Female',
  },
  {
    value: 'fr',
    label: 'French',
    narrator: 'French Female',
  },
  {
    value: 'hi',
    label: 'Hindi',
    narrator: 'Hindi Female',
  },
  {
    value: 'hy',
    label: 'Armenian',
    narrator: 'Armenian Male',
  },
  {
    value: 'it',
    label: 'Italian',
    narrator: 'Italian Female',
  },
  {
    value: 'ja',
    label: 'Japanese',
    narrator: 'Japanese Female',
  },
  {
    value: 'ko',
    label: 'Korean',
    narrator: 'Korean Female',
  },
  {
    value: 'nl',
    label: 'Dutch',
    narrator: 'Dutch Female',
  },
  {
    value: 'pa',
    label: 'Panjabi',
    narrator: 'Hindi Female',
  },
  {
    value: 'pt',
    label: 'Portuguese',
    narrator: 'Portuguese Female',
  },
  {
    value: 'ru',
    label: 'Russian',
    narrator: 'Russian Female',
  },
  {
    value: 'sw',
    label: 'Swahili',
    narrator: 'Swahili Male',
  },
  {
    value: 'tw',
    label: 'Taiwanese',
    narrator: 'Chinese Taiwan Female',
  },
  {
    value: 'ua',
    label: 'Ukrainian',
    narrator: 'Ukrainian Female',
  },
  {
    value: 'zh',
    label: 'Chinese',
    narrator: 'Chinese Female',
  },
]

export function getCourseLanguage(language: string) {
  return (
    CourseLanguages.find((entry) => entry.value === language) ||
    CourseLanguages.find((entry) => entry.value === 'en') ||
    CourseLanguages[0]
  )
}

export function getSuggestedCourseLanguage() {
  const browserLanguages = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
    (navigator as Navigator & { userLanguage?: string }).userLanguage,
    document.documentElement.lang,
  ].filter((language): language is string => Boolean(language))

  const aliases: Record<string, string> = {
    uk: 'ua',
    'zh-cn': 'zh',
    'zh-tw': 'tw',
    'zh-hk': 'tw',
  }

  for (const browserLanguage of browserLanguages) {
    const normalizedLanguage = browserLanguage.toLowerCase()
    const mappedLanguage =
      aliases[normalizedLanguage] ||
      aliases[normalizedLanguage.split(/[-_]/)[0]] ||
      normalizedLanguage.split(/[-_]/)[0]

    const match = CourseLanguages.find((entry) => entry.value === mappedLanguage)

    if (match) {
      return match.value
    }
  }

  return 'en'
}

export function createCourseTemplate(author: string, language: string) {
  const courseLanguage = getCourseLanguage(language)

  return `<!-- 
author: ${author}
language: ${courseLanguage.value}
narrator: ${courseLanguage.narrator}

-->

# 1. Headline
`
}

export function normalizeMarkdownImportUrl(link: string) {
  const trimmedLink = link.trim()

  if (!trimmedLink) {
    return ''
  }

  const viewerPrefixPattern =
    /^https:\/\/liascript\.github\.io\/(?:course|nightly)\/?\?/i

  let normalizedLink = trimmedLink.replace(viewerPrefixPattern, '')

  try {
    normalizedLink = decodeURIComponent(normalizedLink)
  } catch (error) {}

  return normalizedLink.split('#')[0].trim()
}

export function isMarkdownImportUrl(link: string) {
  return /\.md(?:$|[?])/i.test(normalizeMarkdownImportUrl(link))
}

export async function loadMarkdownImport(link: string) {
  const importUrl = normalizeMarkdownImportUrl(link)

  if (!importUrl || !isMarkdownImportUrl(importUrl)) {
    return null
  }

  const response = await fetch(importUrl, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`)
  }

  const content = await response.text()

  if (/^\s*<!doctype html|^\s*<html/i.test(content)) {
    throw new Error('Expected markdown response, received HTML instead')
  }

  return content
}

function splitLeadingCommentBlock(markdown: string) {
  const normalizedMarkdown = markdown.replace(/^\uFEFF/, '')
  const match = normalizedMarkdown.match(/^(\s*<!--\s*\r?\n?[\s\S]*?\r?\n?-->)([\s\S]*)$/)

  if (!match) {
    return {
      header: '',
      body: normalizedMarkdown.trim(),
    }
  }

  return {
    header: match[1],
    body: match[2].trim(),
  }
}

type HeaderEntry =
  | {
      kind: 'field'
      key: string
      lines: string[]
      indent: string
      spacing: string
      valueLines: string[]
    }
  | {
      kind: 'macro'
      key: string
      lines: string[]
      indent: string
      bodyLines: string[]
    }
  | {
      kind: 'raw'
      key: null
      lines: string[]
    }

function stripHeaderDelimiters(header: string) {
  return header
    .trim()
    .replace(/^<!--\s*\r?\n?/, '')
    .replace(/\r?\n?-->$/, '')
}

function parseHeaderEntry(lines: string[], startIndex: number) {
  const line = lines[startIndex]

  const macroMatch = line.match(/^(\s*)(@[^\s:][^:]*?)(?::\s*)?$/)

  if (macroMatch) {
    const entryLines = [line.trimEnd()]
    const bodyLines: string[] = []
    let nextIndex = startIndex + 1

    while (nextIndex < lines.length) {
      const nextLine = lines[nextIndex].trimEnd()
      entryLines.push(nextLine)

      if (/^\s*@end\s*$/.test(nextLine)) {
        nextIndex += 1
        break
      }

      bodyLines.push(nextLine)
      nextIndex += 1
    }

    return {
      entry: {
        kind: 'macro',
        key: macroMatch[2],
        lines: entryLines,
        indent: macroMatch[1],
        bodyLines,
      } as HeaderEntry,
      nextIndex,
    }
  }

  const fieldMatch = line.match(/^(\s*)([^:\s][^:]*?):(\s*)(.*)$/)

  if (fieldMatch) {
    const entryLines = [line.trimEnd()]
    const valueLines = [fieldMatch[4].trim()]
    let nextIndex = startIndex + 1

    while (nextIndex < lines.length) {
      const nextLine = lines[nextIndex]
      const trimmedNextLine = nextLine.trim()

      if (!trimmedNextLine) {
        break
      }

      if (/^\s*@end\s*$/.test(nextLine)) {
        break
      }

      if (/^(\s*)([^:\s][^:]*?):(\s*)(.*)$/.test(nextLine)) {
        break
      }

      if (/^\s*@[^\s:][^:]*\s*$/.test(nextLine)) {
        break
      }

      entryLines.push(nextLine.trimEnd())
      valueLines.push(trimmedNextLine)
      nextIndex += 1
    }

    return {
      entry: {
        kind: 'field',
        key: fieldMatch[2],
        lines: entryLines,
        indent: fieldMatch[1],
        spacing: fieldMatch[3],
        valueLines,
      } as HeaderEntry,
      nextIndex,
    }
  }

  return {
    entry: {
      kind: 'raw',
      key: null,
      lines: [line.trimEnd()],
    } as HeaderEntry,
    nextIndex: startIndex + 1,
  }
}

function parseHeaderEntries(header: string) {
  const content = stripHeaderDelimiters(header)

  if (!content.trim()) {
    return []
  }

  const lines = content.split(/\r?\n/)
  const entries: HeaderEntry[] = []
  let index = 0

  while (index < lines.length) {
    while (index < lines.length && !lines[index].trim()) {
      index += 1
    }

    if (index >= lines.length) {
      break
    }

    const { entry, nextIndex } = parseHeaderEntry(lines, index)
    entries.push(entry)
    index = nextIndex
  }

  return entries
}

function normalizeMergeKey(key: string) {
  return key.trim().toLowerCase()
}

function parseCommaSeparatedValues(valueLines: string[]) {
  return valueLines
    .join(' ')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalizedValue = value.trim()

    if (!normalizedValue || seen.has(normalizedValue)) {
      continue
    }

    seen.add(normalizedValue)
    result.push(normalizedValue)
  }

  return result
}

function renderFieldEntry(entry: Extract<HeaderEntry, { kind: 'field' }>) {
  const prefix = `${entry.indent}${entry.key}:${entry.spacing}`

  if (entry.valueLines.length === 0) {
    return `${prefix}`
  }

  const continuationIndent = ' '.repeat(prefix.length)
  return entry.valueLines
    .map((line, index) => (index === 0 ? `${prefix}${line}` : `${continuationIndent}${line}`))
    .join('\n')
}

function renderMacroEntry(entry: Extract<HeaderEntry, { kind: 'macro' }>) {
  const lines = [`${entry.indent}${entry.key}`]

  for (const line of entry.bodyLines) {
    lines.push(line)
  }

  lines.push(`${entry.indent}@end`)
  return lines.join('\n')
}

function renderHeaderEntry(entry: HeaderEntry) {
  switch (entry.kind) {
    case 'field':
      return renderFieldEntry(entry)
    case 'macro':
      return renderMacroEntry(entry)
    default:
      return entry.lines.join('\n')
  }
}

function splitStyleSegments(lines: string[]) {
  const segments: string[] = []
  let currentSegment: string[] = []
  let braceDepth = 0

  const pushSegment = () => {
    const segment = currentSegment.join('\n').trim()

    if (segment) {
      segments.push(segment)
    }

    currentSegment = []
  }

  for (const originalLine of lines) {
    const line = originalLine.trimEnd()

    if (!line.trim()) {
      if (braceDepth === 0) {
        pushSegment()
      } else {
        currentSegment.push('')
      }
      continue
    }

    currentSegment.push(line)

    for (const character of line) {
      if (character === '{') {
        braceDepth += 1
      } else if (character === '}') {
        braceDepth = Math.max(0, braceDepth - 1)
      }
    }

    if (braceDepth === 0 && /}\s*$/.test(line)) {
      pushSegment()
    }
  }

  pushSegment()
  return segments
}

function mergeFieldValues(current: Extract<HeaderEntry, { kind: 'field' }>, next: Extract<HeaderEntry, { kind: 'field' }>) {
  const mergeKey = normalizeMergeKey(current.key)

  switch (mergeKey) {
    case 'author':
    case '@author': {
      current.valueLines = [
        uniqueValues([
          ...parseCommaSeparatedValues(current.valueLines),
          ...parseCommaSeparatedValues(next.valueLines),
        ]).join(', '),
      ]
      return true
    }

    case 'tags': {
      current.valueLines = [
        uniqueValues([
          ...parseCommaSeparatedValues(current.valueLines),
          ...parseCommaSeparatedValues(next.valueLines),
        ]).join(', '),
      ]
      return true
    }

    case 'comment': {
      const mergedComments = uniqueValues([
        current.valueLines.join('\n').trim(),
        next.valueLines.join('\n').trim(),
      ])

      current.valueLines = mergedComments.flatMap((comment, index) => {
        const lines = comment.split('\n').map((line) => line.trim())
        return index === 0 ? lines : ['', ...lines]
      })
      return true
    }

    case 'link':
    case 'language':
    case 'narrator':
      return true

    default:
      return false
  }
}

function mergeMacroEntries(current: Extract<HeaderEntry, { kind: 'macro' }>, next: Extract<HeaderEntry, { kind: 'macro' }>) {
  const mergeKey = normalizeMergeKey(current.key)

  if (mergeKey !== '@style') {
    return false
  }

  const currentSegments = splitStyleSegments(current.bodyLines)
  const nextSegments = splitStyleSegments(next.bodyLines)

  if (nextSegments.length === 0) {
    return true
  }

  if (currentSegments.length === 0) {
    current.bodyLines = nextSegments.join('\n\n\n').split('\n')
    return true
  }

  const seenSegments = new Set(currentSegments)
  const appendedSegments = nextSegments.filter((segment) => !seenSegments.has(segment))

  if (appendedSegments.length === 0) {
    return true
  }

  current.bodyLines = [...currentSegments, ...appendedSegments].join('\n\n\n').split('\n')
  return true
}

function mergeLeadingCommentBlocks(headers: string[]) {
  const mergedEntries: HeaderEntry[] = []
  const seenBlocks = new Set<string>()
  const keyIndex = new Map<string, number>()

  for (const header of headers) {
    if (!header.trim()) {
      continue
    }

    const entries = parseHeaderEntries(header)

    for (const entry of entries) {
      const entryText = renderHeaderEntry(entry)

      if (entry.kind === 'raw') {
        if (!seenBlocks.has(entryText)) {
          seenBlocks.add(entryText)
          mergedEntries.push(entry)
        }
        continue
      }

      const mergeKey = `${entry.kind}:${normalizeMergeKey(entry.key)}`
      const existingIndex = keyIndex.get(mergeKey)

      if (existingIndex === undefined) {
        mergedEntries.push(entry)
        keyIndex.set(mergeKey, mergedEntries.length - 1)
        seenBlocks.add(entryText)
        continue
      }

      const existingEntry = mergedEntries[existingIndex]
      let merged = false

      if (existingEntry.kind === 'field' && entry.kind === 'field') {
        merged = mergeFieldValues(existingEntry, entry)
      } else if (existingEntry.kind === 'macro' && entry.kind === 'macro') {
        merged = mergeMacroEntries(existingEntry, entry)
      }

      if (!merged && !seenBlocks.has(entryText)) {
        mergedEntries.push(entry)
        seenBlocks.add(entryText)
      }
    }
  }

  const mergedLines = mergedEntries
    .map((entry) => renderHeaderEntry(entry).trimEnd())
    .filter(Boolean)

  if (mergedLines.length === 0) {
    return ''
  }

  return `<!--\n${mergedLines.join('\n\n')}\n-->`
}

export function mergeMarkdownDocuments(markdownDocuments: string[]) {
  const documents = markdownDocuments.map(splitLeadingCommentBlock)
  const mergedHeader = mergeLeadingCommentBlocks(
    documents.map((document) => document.header)
  )
  const mergedBodies = documents
    .map((document) => document.body)
    .filter((body) => body.length > 0)

  if (!mergedHeader) {
    return mergedBodies.join('\n\n')
  }

  if (mergedBodies.length === 0) {
    return `${mergedHeader}\n`
  }

  return `${mergedHeader}\n\n${mergedBodies.join('\n\n')}`
}

export function mergeMarkdownTemplateHeader(
  templateMarkdown: string,
  importedMarkdown: string
) {
  const templateDocument = splitLeadingCommentBlock(templateMarkdown)
  const importedDocument = splitLeadingCommentBlock(importedMarkdown)
  const mergedHeader = mergeLeadingCommentBlocks([
    templateDocument.header,
    importedDocument.header,
  ])

  if (!mergedHeader) {
    return importedDocument.body
  }

  if (!importedDocument.body) {
    return `${mergedHeader}\n`
  }

  return `${mergedHeader}\n\n${importedDocument.body}`
}

export async function loadAndMergeMarkdownImports(...links: string[]) {
  const markdownDocuments: string[] = []

  for (const link of links) {
    if (!link || !isMarkdownImportUrl(link)) {
      continue
    }

    const importedContent = await loadMarkdownImport(link)

    if (importedContent) {
      markdownDocuments.push(importedContent)
    }
  }

  if (markdownDocuments.length === 0) {
    return null
  }

  if (markdownDocuments.length === 1) {
    return markdownDocuments[0]
  }

  return mergeMarkdownDocuments(markdownDocuments)
}

export function storePendingNewCourseTemplate(template: string) {
  sessionStorage.setItem(NEW_COURSE_TEMPLATE, template)
}

export function consumePendingNewCourseTemplate() {
  const template = sessionStorage.getItem(NEW_COURSE_TEMPLATE)

  if (template) {
    sessionStorage.removeItem(NEW_COURSE_TEMPLATE)
  }

  return template
}

/* This function is only required to generate a random string, that is used
as a personal ID for every peer, since it is not possible at the moment to
get the own peer ID from the beaker browser.
*/
export function randomString(
  length: number = 16,
  chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
) {
  // Pick characters randomly
  let str = ''
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return str
}

export function randomColor() {
  return '#' + randomString(6, '0123456789ABCDEF')
}

export function urlPath(path: string[]) {
  return (
    window.location.origin + window.location.pathname + '?/' + path.join('/')
  )
}

const CONFIG = 'config'

export function loadConfig(): {
  lights: boolean
  mode: number
  user: {
    name: string
    color: string
  }
  credentials: any
} {
  const configString = localStorage.getItem(CONFIG)

  let config

  if (configString) {
    config = JSON.parse(configString)

    if (!config.credentials) {
      config.credentials = {}
      storeConfig(config)
    }
  } else {
    config = {
      lights: false,
      mode: 2,
      user: {
        name: randomString(),
        color: randomColor(),
      },
      credentials: {},
    }

    storeConfig(config)
  }

  return config
}

export function storeConfig(config: {
  lights: boolean
  mode: number
  user: {
    name: string
    color: string
  }
  credentials: any
}) {
  localStorage.setItem(CONFIG, JSON.stringify(config))
}

export function getAllSupportedVideoCodecs() {
  return getAllSupportedCodecs('video')
}

export function getAllSupportedCodecs(...mediaTypes: string[]) {
  if (!mediaTypes.length) mediaTypes.push('video', 'audio')
  const CONTAINERS = [
    'webm',
    'ogg',
    'mp3',
    'mp4',
    'x-matroska',
    '3gpp',
    '3gpp2',
    '3gp2',
    'quicktime',
    'mpeg',
    'aac',
    'flac',
    'x-flac',
    'wave',
    'wav',
    'x-wav',
    'x-pn-wav',
    'not-supported',
  ]
  const CODECS = [
    'vp9',
    'vp9.0',
    'vp8',
    'vp8.0',
    'avc1',
    'av1',
    'h265',
    'h.265',
    'h264',
    'h.264',
    'opus',
    'vorbis',
    'pcm',
    'aac',
    'mpeg',
    'mp4a',
    'rtx',
    'red',
    'ulpfec',
    'g722',
    'pcmu',
    'pcma',
    'cn',
    'telephone-event',
    'not-supported',
  ]

  return [
    ...new Set(
      CONTAINERS.flatMap((ext) =>
        mediaTypes.flatMap((mediaType) => [`${mediaType}/${ext}`])
      )
    ),
    ...new Set(
      CONTAINERS.flatMap((ext) =>
        CODECS.flatMap((codec) =>
          mediaTypes.flatMap((mediaType) => [
            // NOTE: 'codecs:' will always be true (false positive)
            `${mediaType}/${ext};codecs=${codec}`,
          ])
        )
      )
    ),
    ...new Set(
      CONTAINERS.flatMap((ext) =>
        CODECS.flatMap((codec1) =>
          CODECS.flatMap((codec2) =>
            mediaTypes.flatMap((mediaType) => [
              `${mediaType}/${ext};codecs="${codec1}, ${codec2}"`,
            ])
          )
        )
      )
    ),
  ].filter((variation) => MediaRecorder.isTypeSupported(variation))
}

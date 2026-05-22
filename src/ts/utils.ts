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

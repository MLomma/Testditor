<script lang="ts">
import Dexie from "../ts/indexDB";
import Card from "../components/Card.vue";
import Footer from "../components/Footer.vue";
import Modal from "../components/Modal.vue";
import NewCourseCard from "../components/NewCourseCard.vue";
import NewCourseModal from "../components/NewCourseModal.vue";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

import MiniSearch from "minisearch";
import * as Utils from "../ts/utils";

import logoImg from "url:../../assets/logo.png";

const OVERVIEW_TRANSLATION_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "uk", label: "Ukrainian" },
  { code: "ar", label: "Arabic" },
  { code: "bg", label: "Bulgarian" },
  { code: "fa", label: "Persian" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "sw", label: "Swahili" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
].sort((left, right) =>
  left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
);

const OVERVIEW_TRANSLATION_COOKIE = "googtrans";
const OVERVIEW_TRANSLATION_RELOAD_KEY = "overview-translation-reload";

function normalizeOverviewLanguage(language?: string) {
  if (!language) {
    return "en";
  }

  const normalized = language.toLowerCase();
  const aliases: Record<string, string> = {
    de: "de",
    en: "en",
    es: "es",
    fr: "fr",
    it: "it",
    nl: "nl",
    pt: "pt",
    ru: "ru",
    ua: "uk",
    uk: "uk",
    ar: "ar",
    bg: "bg",
    fa: "fa",
    hi: "hi",
    ja: "ja",
    ko: "ko",
    sw: "sw",
    zh: "zh-CN",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
    tw: "zh-TW",
  };

  const direct = aliases[normalized];
  if (direct) {
    return direct;
  }

  const short = normalized.split("-")[0];
  return aliases[short] || "en";
}

function readOverviewTranslationCookie() {
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${OVERVIEW_TRANSLATION_COOKIE}=`));

  if (!cookie) {
    return null;
  }

  const value = decodeURIComponent(cookie.split("=")[1] || "");
  const targetLanguage = value.split("/").filter(Boolean)[1];

  return targetLanguage || null;
}

function writeOverviewTranslationCookie(language: string) {
  const value = `/en/${language}`;
  const encoded = encodeURIComponent(value);

  document.cookie = `${OVERVIEW_TRANSLATION_COOKIE}=${encoded}; path=/; SameSite=Lax`;

  const hostname = window.location.hostname;
  if (hostname && hostname !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    document.cookie = `${OVERVIEW_TRANSLATION_COOKIE}=${encoded}; path=/; domain=.${hostname}; SameSite=Lax`;
  }
}

function waitForSync(provider) {
  return new Promise<void>((resolve) => {
    if (provider.synced) {
      resolve();
    } else {
      provider.on("synced", () => {
        resolve();
      });
    }
  });
}

function getTextFor(id: string) {
  const yDoc = new Y.Doc();
  const provider = new IndexeddbPersistence(id, yDoc);

  return new Promise((resolve) => {
    waitForSync(provider).then(() => {
      resolve(yDoc.getText(id).toString()); // Now you can safely access the data
    });
  });
}

export default {
  data() {
    const database = new Dexie();
    const config = Utils.loadConfig();

    const self = this;
    database.watch(null, (e: any) => {
      self.init();
    });

    const search = new MiniSearch({
      idField: "id",
      fields: ["text"],
      storeFields: [],
      searchOptions: {
        boost: { id: 2 },
      },
    });

    return {
      logoImg,
      database,
      search,
      results: [],
      courses: [] as Array<{
        id: string;
        timestamp: number;
        meta: {
          title: string;
          logo: string;
          version: string;
          macro?: { comment: string; tags: string };
          gist_url: string;
        };
      }>,
      coursesFiltered: [] as Array<{
        id: string;
        timestamp: number;
        meta: {
          title: string;
          logo: string;
          version: string;
          macro?: { comment: string; tags: string };
          gist_url: string;
        };
      }>,
      searchText: "",
      tags: [] as Array<{ name: string; active: boolean }>,
      lights: config.lights,
      showNewCourseModal: false,
      translationLanguages: OVERVIEW_TRANSLATION_LANGUAGES,
      translationLanguage: "en",
      translationDropdownOpen: false,
      translationReady: false,
    };
  },

  computed: {
    lightMode() {
      return this.lights ? "bi bi-sun" : "bi bi-moon";
    },

    currentTranslationLabel() {
      return this.translationLanguage.split("-")[0].toUpperCase();
    },
  },

  mounted() {
    this.initSearch();
    this.syncTheme();
    this.initOverviewTranslation();
    document.addEventListener("click", this.handleDocumentClick);
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleDocumentClick);
  },

  watch: {
    lights() {
      this.syncTheme();
    },
  },

  methods: {
    syncTheme() {
      const theme = this.lights ? "light" : "dark";

      document.documentElement.setAttribute("data-bs-theme", theme);
      document.body.setAttribute("data-bs-theme", theme);
      document.body.classList.add("bg-body", "text-body");
    },

    handleSearch() {
      const results = this.search.search(this.searchText, {
        fuzzy: 0.2,
        prefix: true,
        combineWith: "AND",
      });

      this.coursesFiltered = [];
      for (const item of results) {
        const course = this.courses.find((c) => c.id === item.id);

        if (course) this.coursesFiltered.push(course);
      }

      const activeTags = this.tags.filter((t) => t.active).map((t) => t.name);
      if (this.searchText.length === 0 && activeTags.length > 0) {
        this.coursesFiltered = this.courses;
      }

      if (activeTags.length > 0) {
        this.coursesFiltered = this.coursesFiltered.filter((c) => {
          const localTags = c.meta.macro?.tags;
          if (localTags) {
            const localTagsArray = localTags
              .split(",")
              .map((t) => t.trim().toLowerCase());
            return localTagsArray.some((t) => activeTags.includes(t));
          }
          return false;
        });
      }
    },

    async initSearch() {
      const db = await this.database.getAll();

      for (const item of db) {
        getTextFor(item.id).then((text) => {
          this.search.add({ id: item.id, text });
        });
      }
    },

    newCourse() {
      this.showNewCourseModal = true;
    },

    showNewFunctions() {
      this.$refs.modal.show(
        "New Functions",
        `
        <p class="mb-3">
          These additions are currently proof of principles and nothing more.
          They are meant to demonstrate the workflows directly inside the LiveEditor.
        </p>

        <ul class="mb-0">
          <li><strong>Start dialog:</strong> A new course overlay now asks for your name, language, and merge links before the editor opens.</li>
          <li><strong>Dark mode:</strong> The overview and editor now support direct light and dark mode switching.</li>
          <li><strong>Drag and drop into the editor:</strong> Media such as images, audio, and video can be dropped directly into the editor.</li>
          <li><strong>More user-friendly editor controls:</strong> Plus and minus buttons in the editor improve handling and make common actions easier to access.</li>
          <li><strong>Dragging in the live preview:</strong> At least images can now be reordered directly inside the preview area.</li>
          <li><strong>Merging multiple links before start:</strong> Several Markdown links can be entered before opening a new course and merged into one document.</li>
          <li><strong>Merging by drag and drop into the editor:</strong> Dropping a Markdown link into the editor now merges it with the current document instead of only inserting content.</li>
        </ul>
        `
      );
    },

    switchLights() {
      const config = Utils.loadConfig();

      this.lights = !this.lights;
      config.lights = this.lights;
      Utils.storeConfig(config);
    },

    handleDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".overview-translation")) {
        this.translationDropdownOpen = false;
      }
    },

    toggleTranslationDropdown() {
      this.translationDropdownOpen = !this.translationDropdownOpen;
    },

    initOverviewTranslation() {
      const cookieLanguage = readOverviewTranslationCookie();
      const suggestedLanguage = normalizeOverviewLanguage(
        cookieLanguage ||
          (Array.isArray(navigator.languages) ? navigator.languages[0] : "") ||
          navigator.language ||
          document.documentElement.lang
      );

      this.translationLanguage = suggestedLanguage;

      if (cookieLanguage !== suggestedLanguage) {
        writeOverviewTranslationCookie(suggestedLanguage);
      }

      const reloadMarker = sessionStorage.getItem(OVERVIEW_TRANSLATION_RELOAD_KEY);
      if (!cookieLanguage && suggestedLanguage !== "en" && reloadMarker !== suggestedLanguage) {
        sessionStorage.setItem(OVERVIEW_TRANSLATION_RELOAD_KEY, suggestedLanguage);
        window.location.reload();
        return;
      }

      if (reloadMarker === suggestedLanguage || suggestedLanguage === "en") {
        sessionStorage.removeItem(OVERVIEW_TRANSLATION_RELOAD_KEY);
      }

      const windowWithTranslate = window as Window & {
        google?: any;
        googleTranslateElementInit?: () => void;
      };

      const initializeWidget = () => {
        if (!windowWithTranslate.google?.translate?.TranslateElement) {
          return;
        }

        if (!document.getElementById("google_translate_element")?.childElementCount) {
          new windowWithTranslate.google.translate.TranslateElement(
            {
              pageLanguage: "en",
              autoDisplay: false,
              includedLanguages: this.translationLanguages
                .map((language) => language.code)
                .join(","),
            },
            "google_translate_element"
          );
        }

        this.translationReady = true;

        if (this.translationLanguage !== "en") {
          window.setTimeout(() => {
            this.applyOverviewTranslation(this.translationLanguage);
          }, 300);
        }
      };

      windowWithTranslate.googleTranslateElementInit = initializeWidget;

      if (windowWithTranslate.google?.translate?.TranslateElement) {
        initializeWidget();
        return;
      }

      if (!document.getElementById("google-translate-script")) {
        const script = document.createElement("script");
        script.id = "google-translate-script";
        script.src =
          "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        document.head.appendChild(script);
      }
    },

    changeOverviewLanguage(language: string) {
      if (language === this.translationLanguage) {
        this.translationDropdownOpen = false;
        return;
      }

      this.translationLanguage = language;
      this.translationDropdownOpen = false;
      writeOverviewTranslationCookie(language);
      sessionStorage.setItem(OVERVIEW_TRANSLATION_RELOAD_KEY, language);
      window.location.reload();
    },

    applyOverviewTranslation(language: string) {
      if (!this.translationReady) {
        return;
      }

      const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
      if (!combo) {
        window.setTimeout(() => {
          this.applyOverviewTranslation(language);
        }, 250);
        return;
      }

      combo.value = language;
      combo.dispatchEvent(new Event("change", { bubbles: true }));
    },

    async createNewCourse(params: {
      author: string;
      language: string;
      links?: string[];
      link?: string;
      secondaryLink?: string;
    }) {
      let content = Utils.createCourseTemplate(params.author, params.language);
      try {
        const mergeLinks =
          params.links && params.links.length > 0
            ? params.links
            : [params.link || "", params.secondaryLink || ""];

        const importedContent = await Utils.loadAndMergeMarkdownImports(
          ...mergeLinks
        );

        if (importedContent) {
          content = Utils.mergeMarkdownTemplateHeader(content, importedContent);
        }
      } catch (error) {
        console.warn("Could not import markdown for new course", error);
      }

      Utils.storePendingNewCourseTemplate(content);

      this.showNewCourseModal = false;
      window.location.href = Utils.urlPath(["edit"]);
    },

    async init() {
      this.courses = await this.database.getAll();

      var tags = new Set();
      for (const course of this.courses) {
        let localTags = course.meta.macro?.tags;

        if (localTags) {
          localTags = localTags.split(",").map((t) => t.trim().toLowerCase());
          localTags.forEach((t) => tags.add(t));
        }
      }

      this.tags = Array.from(tags)
        .sort()
        .map((t) => {
          return { name: t, active: false };
        });
    },

    drop(id: string) {
      this.database.drop(id);
      window.indexedDB.deleteDatabase(id);
      this.init();

      const self = this;

      setTimeout(() => {
        self.handleSearch();
      }, 100);
    },
  },

  async created() {
    await this.init();
  },

  components: { Card, Footer, Modal, NewCourseCard, NewCourseModal },
};
</script>

<template>
  <div :data-bs-theme="lights ? 'light' : 'dark'" class="bg-body text-body min-vh-100">
    <nav class="navbar navbar-expand-lg" :class="lights ? 'navbar-light bg-light' : 'navbar-dark bg-dark'">
      <div class="container-fluid">
        <div class="d-flex align-items-center gap-3">
          <a class="navbar-brand mb-0">
            <img :src="logoImg" alt="LiaScript" height="28" />
            LiaEdit
          </a>

          <button
            type="button"
            class="btn btn-primary overview-action-button"
            @click="showNewFunctions"
          >
            <span class="overview-action-button__label">New Functions</span>
          </button>
        </div>

        <div class="d-flex align-items-center gap-2">
          <button
            type="button"
            class="btn btn-outline-secondary px-3 toolbar-outline-button overview-action-button"
            @click="switchLights()"
            title="Switch between light and dark mode"
          >
            <span class="overview-action-button__label overview-action-button__label--icon">
              <i :class="lightMode"></i>
            </span>
          </button>

          <div class="overview-translation position-relative">
            <button
              type="button"
              class="btn btn-outline-secondary px-3 toolbar-outline-button overview-action-button"
              title="Translate overview"
              @click="toggleTranslationDropdown"
            >
              <span class="overview-action-button__label">{{ currentTranslationLabel }}</span>
            </button>

            <div
              v-if="translationDropdownOpen"
              class="overview-translation-menu shadow rounded bg-body border"
            >
              <button
                v-for="language in translationLanguages"
                :key="language.code"
                type="button"
                class="dropdown-item overview-translation-item"
                :class="{ active: translationLanguage === language.code }"
                @click="changeOverviewLanguage(language.code)"
              >
                <span class="overview-translation-code">
                  {{ language.code.split('-')[0].toUpperCase() }}
                </span>
                {{ language.label }}
              </button>
            </div>
          </div>

          <button class="btn btn-primary overview-action-button" @click="newCourse">
            <span class="overview-action-button__label">New Course</span>
          </button>
        </div>
      </div>
    </nav>

    <div id="google_translate_element" class="visually-hidden"></div>

    <div
      class="container-fluid px-0 pb-5"
      style="max-width: 100vw !important; height: 100%; overflow: scroll"
    >
    <div class="px-4 mt-4 mb-0">
      <div style="width: min(100%, 50rem); margin: 0 auto">
        <NewCourseCard @create="newCourse" />
      </div>
    </div>

    <div class="mx-auto mt-5 mb-5" style="width: 95vw">
      <hr class="overview-divider mb-4" />
      <hr class="overview-divider mt-4 mb-0" />
    </div>

    <div class="input-group" style="padding: 0rem 5rem 0rem 5rem">
      <input
        class="form-control"
        placeholder="Type to search..."
        @input="handleSearch"
        v-model="searchText"
        aria-label="Search input"
        :disabled="courses.length === 0"
      />

      <div class="input-group-append">
        <button
          class="btn btn-icon"
          style="border: 0px"
          type="button"
          @click="searchText = ''"
          aria-label="Clear search"
          :disabled="courses.length === 0 || searchText.length === 0"
        >
          <i class="bi bi-x-lg"> </i>
        </button>
      </div>
    </div>

    <div :v-if="tags.length > 0" style="text-align: center; padding: 2rem 5rem 0rem 5rem">
      <button
        v-for="tag of tags"
        class="btn badge rounded-pill"
        :class="{ 'bg-primary': tag.active, 'bg-secondary': !tag.active }"
        @click="
          tag.active = !tag.active;
          handleSearch();
        "
        style="margin-right: 0.25rem"
      >
        {{ tag.name }}
      </button>
    </div>

    <div
      class="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-8 m-4"
      v-if="searchText.length > 0 || coursesFiltered.length > 0"
    >
      <Card
        v-for="item of coursesFiltered"
        :key="item.id"
        :card-id="item.id"
        :card-timestamp="item.timestamp"
        :card-title="item.meta.title"
        :card-logo="item.meta.logo"
        :card-version="item.meta.version"
        :card-comment="item.meta.macro?.comment"
        :card-gist="item.meta.gist_url"
        :card-tags="item.meta.macro?.tags"
        @drop="drop"
      />
    </div>

    <div class="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-8 m-4" v-else>
      <Card
        v-for="item of courses"
        :key="item.id"
        :card-id="item.id"
        :card-timestamp="item.timestamp"
        :card-title="item.meta.title"
        :card-logo="item.meta.logo"
        :card-version="item.meta.version"
        :card-comment="item.meta.macro?.comment"
        :card-gist="item.meta.gist_url"
        :card-tags="item.meta.macro?.tags"
        @drop="drop"
      />
    </div>

    <Footer>
      This is a collaborative online editor for
      <a href="https://LiaScript.github.io" target="_blank">LiaScript</a>. All content is
      stored only within your browser. If you need some inspiration, check out some of our
      <a href="./examples.html">examples</a>, search for embeddable
      <a href="https://github.com/topics/liascript-template" target="_blank">templates</a
      >, or already published
      <a href="https://github.com/topics/liascript-course" target="_blank">courses</a>.
    </Footer>

      <NewCourseModal
        :visible="showNewCourseModal"
        @close="showNewCourseModal = false"
        @create="createNewCourse"
      />

      <Modal ref="modal" />
    </div>
  </div>
</template>

<style scoped>
.toolbar-outline-button {
  border-width: 2px;
}

.overview-action-button {
  height: 40px !important;
  min-height: 40px;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  line-height: 1;
  text-align: center;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
}

.overview-action-button__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 1;
  text-align: center;
}

.overview-action-button__label--icon {
  width: auto;
}

.overview-action-button__label :deep(font) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.overview-divider {
  border-top: 2px solid #147375;
  opacity: 1;
}

.overview-translation-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 20;
  min-width: 15rem;
  max-height: 20rem;
  overflow: auto;
  border-color: #147375 !important;
}

.overview-translation-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
}

.overview-translation-item.active,
.overview-translation-item:active,
.overview-translation-item:hover {
  background-color: rgba(20, 115, 117, 0.14);
  color: inherit;
}

.overview-translation-code {
  min-width: 2rem;
  font-weight: 700;
  color: #147375;
}
</style>

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
import {
  OVERVIEW_TRANSLATION_LANGUAGES,
  OVERVIEW_TRANSLATION_RELOAD_KEY,
  clearOverviewTranslationCookie,
  getOverviewUi,
  normalizeOverviewLanguage,
  readOverviewTranslationCookie,
  readStoredOverviewLanguage,
  supportsNativeOverviewLanguage,
  writeOverviewTranslationCookie,
  writeStoredOverviewLanguage,
} from "../ts/overviewI18n";

import logoImg from "url:../../assets/logo.png";

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

    overviewUi() {
      return getOverviewUi(this.translationLanguage);
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
    sanitizeModalText(value) {
      return String(value ?? "")
        .replace(/\uFFFD/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    syncTheme() {
      const theme = this.lights ? "light" : "dark";
      const backgroundColor = this.lights ? "" : "#323232";

      document.documentElement.setAttribute("data-bs-theme", theme);
      document.body.setAttribute("data-bs-theme", theme);
      document.body.classList.add("bg-body", "text-body");
      document.documentElement.style.backgroundColor = backgroundColor;
      document.body.style.backgroundColor = backgroundColor;

      const app = document.getElementById("app");
      if (app) {
        app.style.backgroundColor = backgroundColor;
      }
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
      const items = this.overviewUi.newFunctionsItems
        .map(
          (item) =>
            `<li><strong>${this.sanitizeModalText(item.title)}:</strong> ${this.sanitizeModalText(item.description)}</li>`
        )
        .join("");

      this.$refs.modal.show(
        this.sanitizeModalText(this.overviewUi.newFunctionsTitle),
        `
        <p class="mb-3">
          ${this.sanitizeModalText(this.overviewUi.newFunctionsIntro)}
        </p>

        <ul class="mb-0">
          ${items}
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
        readStoredOverviewLanguage() ||
          cookieLanguage ||
          (Array.isArray(navigator.languages) ? navigator.languages[0] : "") ||
          navigator.language ||
          document.documentElement.lang
      );

      this.translationLanguage = suggestedLanguage;
      writeStoredOverviewLanguage(suggestedLanguage);

      if (supportsNativeOverviewLanguage(suggestedLanguage)) {
        if (cookieLanguage && cookieLanguage !== "en") {
          clearOverviewTranslationCookie();
          sessionStorage.removeItem(OVERVIEW_TRANSLATION_RELOAD_KEY);
          window.location.reload();
          return;
        }

        sessionStorage.removeItem(OVERVIEW_TRANSLATION_RELOAD_KEY);
        this.translationReady = false;
        return;
      }

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
      const normalizedLanguage = normalizeOverviewLanguage(language);

      if (normalizedLanguage === this.translationLanguage) {
        this.translationDropdownOpen = false;
        return;
      }

      const cookieLanguage = readOverviewTranslationCookie();

      this.translationLanguage = normalizedLanguage;
      this.translationDropdownOpen = false;
      writeStoredOverviewLanguage(normalizedLanguage);

      if (supportsNativeOverviewLanguage(normalizedLanguage)) {
        clearOverviewTranslationCookie();
        sessionStorage.removeItem(OVERVIEW_TRANSLATION_RELOAD_KEY);

        if (cookieLanguage && cookieLanguage !== "en") {
          window.location.reload();
        }

        return;
      }

      writeOverviewTranslationCookie(normalizedLanguage);
      sessionStorage.setItem(OVERVIEW_TRANSLATION_RELOAD_KEY, normalizedLanguage);
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
  <div
    :data-bs-theme="lights ? 'light' : 'dark'"
    :class="['overview-page', lights ? 'overview-page--light' : 'overview-page--dark']"
  >
    <nav
      class="navbar navbar-expand-lg overview-nav"
      :class="lights ? 'navbar-light bg-light' : 'navbar-dark bg-dark'"
    >
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
            <span class="overview-action-button__label">{{ overviewUi.newFunctionsButton }}</span>
          </button>
        </div>

        <div class="d-flex align-items-center gap-2">
          <button
            type="button"
            class="btn btn-outline-secondary px-3 toolbar-outline-button overview-action-button"
            @click="switchLights()"
            :title="overviewUi.switchThemeTitle"
          >
            <span class="overview-action-button__label overview-action-button__label--icon">
              <i :class="lightMode"></i>
            </span>
          </button>

          <div class="overview-translation position-relative">
            <button
              type="button"
              class="btn btn-outline-secondary px-3 toolbar-outline-button overview-action-button"
              :title="overviewUi.translateOverviewTitle"
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
            <span class="overview-action-button__label">{{ overviewUi.newCourse }}</span>
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
        <NewCourseCard :ui="overviewUi" @create="createNewCourse" />
      </div>
    </div>

    <div class="mx-auto mt-5 mb-5" style="width: 95vw">
      <hr class="overview-divider mb-4" />
      <hr class="overview-divider mt-4 mb-0" />
    </div>

    <div class="input-group" style="padding: 0rem 5rem 0rem 5rem">
      <input
        class="form-control"
        :placeholder="overviewUi.searchPlaceholder"
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
          :aria-label="overviewUi.clearSearch"
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
        :ui="overviewUi"
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
        :ui="overviewUi"
        @drop="drop"
      />
    </div>

    <Footer :social-label="overviewUi.followUsOn">
      {{ overviewUi.footerBeforeExamples }}
      <a href="https://LiaScript.github.io" target="_blank">LiaScript</a>
      {{ overviewUi.footerBetweenExamplesAndTemplates }}
      <a href="./examples.html">{{ overviewUi.examples }}</a>
      {{ overviewUi.footerBetweenTemplatesAndCourses }}
      <a href="https://github.com/topics/liascript-template" target="_blank">{{ overviewUi.templates }}</a>
      {{ overviewUi.footerAfterCourses }}
      <a href="https://github.com/topics/liascript-course" target="_blank">{{ overviewUi.courses }}</a>{{ overviewUi.footerEnd }}
    </Footer>

      <NewCourseModal
        :visible="showNewCourseModal"
        :ui="overviewUi"
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
  font-weight: 700;
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

.overview-page {
  min-height: 100vh;
}

.overview-page--dark,
.overview-page--dark .container-fluid,
.overview-page--dark .bg-body {
  background-color: #323232 !important;
}

.overview-divider {
  border-top: 2px solid #38cccc;
  opacity: 1;
}

.overview-nav.navbar-dark {
  background-color: #323232 !important;
}

.overview-translation-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 20;
  min-width: 15rem;
  max-height: 20rem;
  overflow: auto;
  border-color: #38cccc !important;
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
  background-color: rgba(56, 204, 204, 0.14);
  color: inherit;
}

.overview-translation-code {
  min-width: 2rem;
  font-weight: 700;
  color: #38cccc;
}
</style>

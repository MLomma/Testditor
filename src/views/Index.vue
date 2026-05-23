<script lang="ts">
import Dexie from "../ts/indexDB";
import Card from "../components/Card.vue";
import Footer from "../components/Footer.vue";
import Modal from "../components/Modal.vue";
import NewCourseModal from "../components/NewCourseModal.vue";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

import MiniSearch from "minisearch";
import * as Utils from "../ts/utils";

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
    };
  },

  computed: {
    lightMode() {
      return this.lights ? "bi bi-sun" : "bi bi-moon";
    },
  },

  mounted() {
    this.initSearch();
    this.syncTheme();
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

  components: { Card, Footer, Modal, NewCourseModal },
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
            class="btn btn-primary"
            @click="showNewFunctions"
          >
            New Functions
          </button>
        </div>

        <div class="d-flex align-items-center gap-2">
          <button
            type="button"
            class="btn btn-outline-secondary px-3"
            @click="switchLights()"
            title="Switch between light and dark mode"
          >
            <i :class="lightMode"></i>
          </button>

          <button class="btn btn-primary" @click="newCourse">New Course</button>
        </div>
      </div>
    </nav>

    <div
      class="container mx-0 px-0 pb-5"
      style="max-width: 100vw !important; height: 100%; overflow: scroll"
    >
    <div class="input-group" style="padding: 2rem 5rem 0rem 5rem">
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

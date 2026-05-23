<script lang="ts">
import { CourseLanguages, getSuggestedCourseLanguage } from "../ts/utils";

export default {
  name: "NewCourseCard",
  emits: ["create"],

  data() {
    return {
      author: "",
      language: getSuggestedCourseLanguage(),
      links: [""],
      languages: CourseLanguages,
    };
  },

  methods: {
    addLinkField() {
      this.links.push("");
    },

    linkLabel(index: number) {
      if (index === 0) {
        return "Import course content from this link";
      }

      return `Link ${index + 1}`;
    },

    linkPlaceholder(index: number) {
      if (index === 0) {
        return "Optional link to a Markdown file";
      }

      return `Optional merge link ${index + 1}`;
    },

    linkId(index: number) {
      return `new-course-card-link-${index + 1}`;
    },

    submit() {
      const author = this.author.trim();
      const links = this.links.map((link) => link.trim());

      if (!author) {
        return;
      }

      this.$emit("create", {
        author,
        language: this.language,
        links,
      });
    },
  },
};
</script>

<template>
  <div class="d-block w-100" style="height: inherit">
    <div class="card shadow bg-body rounded h-100 w-100 border-primary-subtle overflow-hidden">
      <div class="card-body pb-0">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <h4 class="fw-bold mb-0">New Course</h4>
        </div>
      </div>

      <div class="card-body pt-0">
        <p class="mb-0">
          <small>
            Create a new course directly from the overview with author, language,
            and optional merge links.
          </small>
        </p>

        <div class="mt-4">
          <div class="mb-2">
            <label class="form-label" for="new-course-card-author">Author name</label>
            <input
              id="new-course-card-author"
              v-model="author"
              type="text"
              class="form-control"
              placeholder="Your name"
              @keyup.enter="submit"
            />
          </div>

          <div>
            <label class="form-label" for="new-course-card-language">Language</label>
            <select
              id="new-course-card-language"
              v-model="language"
              class="form-select"
            >
              <option
                v-for="option in languages"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div
            v-for="(link, index) in links"
            :key="linkId(index)"
            :class="index === 0 ? 'mt-2' : 'mt-3'"
          >
            <label class="form-label" :for="linkId(index)">
              {{ linkLabel(index) }}
            </label>
            <input
              :id="linkId(index)"
              v-model="links[index]"
              type="url"
              class="form-control"
              :placeholder="linkPlaceholder(index)"
              @keyup.enter="submit"
            />
          </div>

          <button
            type="button"
            class="new-course-add-button mt-4"
            aria-label="Add another merge link"
            title="Add another merge link"
            @click="addLinkField"
          >
            <span class="new-course-add-button__line" aria-hidden="true"></span>
            <span class="new-course-add-button__circle" aria-hidden="true">
              <span class="new-course-add-button__glyph">+</span>
            </span>
          </button>

          <div class="d-flex justify-content-center align-items-center mt-3">
            <button
              type="button"
              class="btn btn-primary px-4 new-course-submit-button"
              :disabled="author.trim().length === 0"
              @click="submit"
            >
              <span class="new-course-submit-button__label">Create</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-course-add-button {
  position: relative;
  display: block;
  width: 100%;
  min-height: 2.4rem;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  transform-origin: center;
  transition: filter 0.14s cubic-bezier(0.2, 0.9, 0.2, 1),
    transform 0.14s cubic-bezier(0.2, 0.9, 0.2, 1);
}

.new-course-add-button:hover,
.new-course-add-button:focus-visible {
  filter: drop-shadow(0 0 0.45rem rgba(20, 115, 117, 0.76));
  transform: translateY(-1px) scaleX(1.035) scaleY(1.08);
  outline: none;
}

.new-course-add-button__line {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  border-top: 0.2rem solid var(--bs-primary);
  transform: translateY(-50%);
}

.new-course-add-button__circle {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  margin: 0 auto;
  background: var(--bs-body-bg);
  border: 0.2rem solid var(--bs-primary);
  border-radius: 50%;
}

.new-course-add-button__glyph {
  color: var(--bs-primary);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1;
  transform: translateY(-0.08rem);
}

.new-course-submit-button {
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
}

.new-course-submit-button__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 1;
  text-align: center;
}

.new-course-submit-button__label :deep(font) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
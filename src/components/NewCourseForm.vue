<script lang="ts">
import { CourseLanguages, getSuggestedCourseLanguage } from "../ts/utils";

export default {
  name: "NewCourseForm",
  props: {
    idPrefix: {
      type: String,
      default: "new-course",
    },
    variant: {
      type: String,
      default: "modal",
    },
    ui: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ["create"],

  data() {
    return {
      author: "",
      language: getSuggestedCourseLanguage(),
      links: [""],
      languages: CourseLanguages,
      showAdditionalLinks: false,
    }
  },

  methods: {
    text(key: string, fallback: string) {
      return (this.ui && this.ui[key]) || fallback;
    },

    lowercaseFirst(text: string) {
      if (!text) {
        return text;
      }

      return text.charAt(0).toLowerCase() + text.slice(1);
    },

    isInline() {
      return this.variant === "inline";
    },

    fieldId(name: string) {
      return `${this.idPrefix}-${name}`;
    },

    linkLabel(index: number) {
      if (index === 0) {
        return this.text("linkLabel", "Link");
      }

      return `${index + 1}. ${this.text("linkLabel", "Link")}`;
    },

    linkId(index: number) {
      return `${this.idPrefix}-link-${index + 1}`;
    },

    addLinkField() {
      this.links.push("");
    },

    visibleLinks() {
      return this.links.slice(0, 1);
    },

    additionalLinks() {
      return this.links.slice(1);
    },

    optionalMergeLinkPlaceholder(linkNumber: number) {
      return `${linkNumber}. ${this.lowercaseFirst(
        this.text("optionalMergeLinkPrefix", "Optional merge link")
      )}`;
    },

    submit() {
      const author = this.author.trim();
      const links = this.links.map((link) => link.trim());

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
  <div>
    <div :class="isInline() ? 'mb-2' : 'mb-3'">
      <label class="form-label" :for="fieldId('author')">{{ text("authorName", "Author name") }}</label>
      <input
        :id="fieldId('author')"
        v-model="author"
        type="text"
        class="form-control"
        :placeholder="text('yourName', 'Your name')"
        @keyup.enter="submit"
      />
    </div>

    <div>
      <label class="form-label" :for="fieldId('language')">{{ text("language", "Language") }}</label>
      <select
        :id="fieldId('language')"
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
      v-for="(link, index) in visibleLinks()"
      :key="linkId(index)"
      :class="isInline() ? 'mt-2' : 'mt-3'"
    >
      <label class="form-label" :for="linkId(index)">
        {{ index === 0 ? text('importLinkLabel', 'Import course content from this link') : linkLabel(index) }}
      </label>
      <input
        :id="linkId(index)"
        v-model="links[index]"
        type="url"
        class="form-control"
        :placeholder="
          index === 0
            ? text('optionalMarkdownLink', 'Optional link to a Markdown file')
            : optionalMergeLinkPlaceholder(index + 1)
        "
        @keyup.enter="submit"
      />
    </div>

    <div
      v-for="(link, localIndex) in additionalLinks()"
      :key="linkId(localIndex + 1)"
      class="mt-3"
    >
      <label class="form-label" :for="linkId(localIndex + 1)">
        {{ linkLabel(localIndex + 1) }}
      </label>
      <input
        :id="linkId(localIndex + 1)"
        v-model="links[localIndex + 1]"
        type="url"
        class="form-control"
        :placeholder="optionalMergeLinkPlaceholder(localIndex + 2)"
        @keyup.enter="submit"
      />
    </div>

    <button
      type="button"
      class="new-course-add-button mt-4"
      :aria-label="text('addMergeLink', 'Add another merge link')"
      :title="text('addMergeLink', 'Add another merge link')"
      @click="addLinkField"
    >
      <span class="new-course-add-button__line" aria-hidden="true"></span>
      <span class="new-course-add-button__circle" aria-hidden="true">
        <span class="new-course-add-button__glyph">+</span>
      </span>
    </button>

    <div class="d-flex justify-content-center align-items-center mt-3">
      <button
        v-if="isInline()"
        type="button"
        class="btn btn-primary px-4 new-course-submit-button"
        @click="submit"
      >
        <span class="new-course-submit-button__label">{{ text('create', 'Create') }}</span>
      </button>
    </div>

    <div v-if="!isInline()" class="d-flex justify-content-center mt-3">
      <button
        type="button"
        class="btn btn-primary px-4 new-course-submit-button"
        @click="submit"
      >
        <span class="new-course-submit-button__label">{{ text('createNewCourseButton', 'Create new course') }}</span>
      </button>
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
  filter: drop-shadow(0 0 0.45rem rgba(56, 204, 204, 0.76));
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
<script lang="ts">
import { CourseLanguages, getSuggestedCourseLanguage } from "../ts/utils";

export default {
  name: "NewCourseModal",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["close", "create"],

  data() {
    return {
      author: "",
      language: getSuggestedCourseLanguage(),
      link: "",
      languages: CourseLanguages,
    };
  },

  methods: {
    submit() {
      const author = this.author.trim();
      const link = this.link.trim();

      if (!author) {
        return;
      }

      this.$emit("create", {
        author,
        language: this.language,
        link,
      });
    },

    close() {
      this.$emit("close");
    },
  },
};
</script>

<template>
  <div
    v-if="visible"
    class="modal fade show d-block"
    tabindex="-1"
    aria-modal="true"
    role="dialog"
    style="background-color: rgba(0, 0, 0, 0.45)"
    @click.self="close"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Create New Course</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="close"
          ></button>
        </div>

        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label" for="new-course-author">Name</label>
            <input
              id="new-course-author"
              v-model="author"
              type="text"
              class="form-control"
              placeholder="Your name"
              @keyup.enter="submit"
            />
          </div>

          <div>
            <label class="form-label" for="new-course-language">Language</label>
            <select
              id="new-course-language"
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

          <div class="mt-3">
            <label class="form-label" for="new-course-link">Link</label>
            <input
              id="new-course-link"
              v-model="link"
              type="url"
              class="form-control"
              placeholder="Optional link to a Markdown file"
              @keyup.enter="submit"
            />
          </div>
        </div>

        <div class="modal-footer justify-content-center">
          <button
            type="button"
            class="btn btn-primary px-4"
            :disabled="author.trim().length === 0"
            @click="submit"
          >
            Create new course
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
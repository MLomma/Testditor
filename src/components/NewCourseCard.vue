<script lang="ts">
import NewCourseForm from "./NewCourseForm.vue";

export default {
  name: "NewCourseCard",
  props: {
    ui: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ["create"],

  components: { NewCourseForm },
};
</script>

<template>
  <div class="d-block w-100" style="height: inherit">
    <div class="card shadow bg-body rounded h-100 w-100 border-primary-subtle overflow-hidden">
      <div class="card-body pb-0">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <h4 class="fw-bold mb-0">{{ ui.newCourse || 'New Course' }}</h4>
        </div>
      </div>

      <div class="card-body pt-0">
        <p class="mb-0">
          <small>
            {{
              ui.newCourseCardDescription ||
              'Create a new course directly from the overview with author, language, and optional merge links.'
            }}
          </small>
        </p>

        <div class="mt-4">
          <NewCourseForm
            id-prefix="new-course-card"
            variant="inline"
            :ui="ui"
            @create="$emit('create', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
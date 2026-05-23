<script lang="ts">
import NewCourseForm from "./NewCourseForm.vue";

export default {
  name: "NewCourseModal",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["close", "create"],

  methods: {
    close() {
      this.$emit("close");
    },
  },

  components: { NewCourseForm },
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
          <NewCourseForm id-prefix="new-course-modal" @create="$emit('create', $event)" />
        </div>
      </div>
    </div>
  </div>
</template>
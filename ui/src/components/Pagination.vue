<script setup lang="ts">
import PaginationArrow from './PaginationArrow.vue'

const props = defineProps({
  hasMoreData: {
    type: Boolean,
    default: false
  },
  hasPrev: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="flex gap-4 align-middle items-center">
    <PaginationArrow
      direction="left"
      @click="$emit('prev')"
      :isDisabled="!props.hasPrev"
    />
    <PaginationArrow
      direction="right"
      @click="$emit('next')"
      :isDisabled="!props.hasMoreData"
    />
  </div>
</template>

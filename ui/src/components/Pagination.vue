<script setup lang="ts">
import { useUrlSearchParams } from '@vueuse/core'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PaginationArrow from './PaginationArrow.vue'

const route = useRoute()
const urlParams = useUrlSearchParams('history')

const currentPage = computed({
  get: () => Number(route.query.page) || 1,
  set: (pageNumber: number) => {
    urlParams.page = String(pageNumber)
  },
})

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
  <div className="flex gap-4 align-middle items-center">
    <PaginationArrow
      direction="left"
      @click="$emit('prev')"
      :isDisabled="!props.hasPrev"
    />
    <h3>Page {{ currentPage }}</h3>
    <PaginationArrow
      direction="right"
      @click="$emit('next')"
      :isDisabled="!props.hasMoreData"
    />
  </div>
</template>

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

const pathname = computed(() => route.path)

const createPageURL = (pageNumber: number) => {
  const currentParams: Record<string, any> = { ...urlParams }
  currentParams.page = String(pageNumber)

  const params = new URLSearchParams(currentParams)
  return `${pathname.value}?${params.toString()}`
}

const props = defineProps({
  totalPages: {
    type: Number,
    required: true,
  },
})
</script>

<template>
  <div className="flex gap-4 align-middle items-center">
    <PaginationArrow
      direction="left"
      :href="createPageURL(currentPage - 1)"
      :isDisabled="currentPage <= 1"
    />
    <h3>Page {{ currentPage }} of {{ props.totalPages }}</h3>
    <PaginationArrow
      direction="right"
      :href="createPageURL(currentPage + 1)"
      :isDisabled="currentPage >= props.totalPages"
    />
  </div>
</template>

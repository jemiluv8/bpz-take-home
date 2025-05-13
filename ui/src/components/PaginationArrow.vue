<template>
  <div v-if="isDisabled" :class="containerClasses">
    <component :is="ArrowComponent" :size="20" />
  </div>
  <router-link v-else :to="href" :class="containerClasses">
    <component :is="ArrowComponent" :size="20" />
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router' // Import RouterLink if not globally available

// Import your icon components
import { MoveLeft, MoveRight } from 'lucide-vue-next'

const props = defineProps({
  href: {
    type: String,
    required: true,
  },
  direction: {
    type: String as () => 'left' | 'right', // Type assertion for union type
    required: true,
    validator: (value: string) => ['left', 'right'].includes(value),
  },
  isDisabled: {
    type: Boolean,
    default: false,
  },
})

// Computed property for dynamic classes, similar to clsx
const containerClasses = computed(() => [
  'flex h-8  w-12 items-center justify-center rounded-md border', // Base classes
  {
    'pointer-events-none text-blue-300': props.isDisabled,
    'hover:bg-blue-100': !props.isDisabled,
    'mr-2 md:mr-4': props.direction === 'left',
    'ml-2 md:ml-4': props.direction === 'right',
  },
])

// Computed property to select the correct icon component
const ArrowComponent = computed(() => {
  return props.direction === 'left' ? MoveLeft : MoveRight
})
</script>

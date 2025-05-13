<script setup lang="ts">
</script>

<template>
<main>
    <section class="flex justify-between mb-6 py-6">
      <!-- <h3 class="text-lg">
        Orders
      </h3> -->
      <button @click="$router.push('/')" class="flex h-10 items-center rounded-lg bg-blue-600 transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        <h1 class="text-white font-medium px-6">Back to Orders</h1>
      </button>
    </section>
    <h1 class="text-center">CREATE NEW ORDER</h1>
</main>
</template>

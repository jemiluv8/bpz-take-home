<template>
  <div class="fallbackSpinner appLoader">
    <div class="loading">
      <div class="effect1"></div>
      <div class="effect2"></div>
      <div class="effect3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No script logic needed for this simple spinner component
</script>

<style scoped>
/* Styles translated from FallbackSpinner.module.css */

.fallbackSpinner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fallbackSpinner.appLoader {
  height: 70vh; /* Use 100vh for full viewport height */
  flex-direction: column;
}

.loading {
  margin-top: 1rem;
  width: 55px;
  height: 55px;
  border-radius: 50%;
  border: 3px solid transparent;
  box-sizing: border-box;
  position: relative;
}

.effect1,
.effect2,
.effect3 {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-left: 3px solid rgba(121, 97, 249, 1); /* Using the specific color from the original CSS */
  box-sizing: border-box;
  position: absolute;
  top: 0; /* Position effects correctly within the loading container */
  left: 0;
}

.effect1 {
  animation: rotate 1s ease infinite;
}

.effect2 {
  animation: rotateOpacity 1s ease infinite 0.1s;
}

.effect3 {
  animation: rotateOpacity 1s ease infinite 0.2s;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(1turn);
  }
}

@keyframes rotateOpacity {
  0% {
    transform: rotate(0deg);
    opacity: 0.1;
  }
  100% {
    transform: rotate(1turn);
    opacity: 1;
  }
}
</style>

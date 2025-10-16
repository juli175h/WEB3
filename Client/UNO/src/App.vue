<script setup lang="ts">
import {RouterView} from 'vue-router'

</script>

<template>
  <h1 class="header">UNO!!!!!!!!!</h1>
  <div class="page-container">
    <RouterView />
  </div>
</template>

<style>
  #app {
    background-color: rgb(243, 244, 245);
    margin: 10px;
    padding: 0.6rem;
    overflow: auto;
  }
  html {
    height: 100%;
  }
  body {
    width: 1024px;
    height: 100%;
    margin: 0 auto;
    background-color:rgb(20, 30, 47);
  }
</style>

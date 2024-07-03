# Vue Open Book
This is an open-source, TypeScript based, spreadhseet component for Vue 3.


## Installation
To install, run
```
npm install vue-open-book
```

## Usage
Import the `OpenBook` component, define a reactive variable and pass it to the `data` model of the `OpenBook` component.
Valid `data` elements are numbers, strings, `null` and `undefined`.
You also need to import the styles file from the `dist` folder.
```
<template>
  <div>
    Hello, this is an example.
    <OpenBook v-model:data="myData"></OpenBook>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { OpenBook } from 'vue-open-book';

import 'vue-open-book/dist/style.css';

const myData = ref([
  [1, 2, 3, undefined, 5],
  [6, null, 8, 'nine', 10],
]);
</script>
```

`null` and `undefined` are shown as empty cells.

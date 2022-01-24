<template>
  <div id="app">
    <container :elements="elements" :snap-grid="true" :zoom="1">
      <ft-element v-for="el in elements" v-slot:default="slotProps"
          :elem="el" 
          :active="el.active" 
          :key="el.id"
          @activated="activatedHandler">
          <h1>Hello Text</h1>
        </ft-element>
    </container>
  </div>
</template>

<script>
import Container from './components/Container.vue'
import FtElement from './components/FtElement.vue'

export default {
  /* eslint-disable */
  name: 'app',
  components: {
    Container,
    FtElement
  },
  data: function () {
    return {
      elements: [
        { id: 'elm001', x: 300, y: 150, rotation: 30, width: 100, height: 100, minWidth: 40, minHeight: 40, fixedRatio: true, active: false },
        { id: 'elm002', x: 100, y: 10, rotation: 0, width: 150, height: 80, minWidth: 20, minHeight: 20, fixedRatio: false, active: false }
      ]
    }
  },
  methods: {
    activatedHandler(e, elem) {

    },
    foo(v){
      return v;
    }
  }
}
</script>

// Can use Dynamic Components? https://vuejs.org/v2/guide/components.html#Dynamic-Components

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

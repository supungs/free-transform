<template>
  <div class="element" data-element="true" 
    :id="'ft-'+elem.id"
    :style="style"
    @mousedown="e => onActivated(e)"
  >
    <!-- IMPORTANT! KEEP SLOT AS FIRST CHILD -->
    <slot></slot>
    <!-- IMPORTANT! KEEP SLOT AS FIRST CHILD -->
    <template  v-if="resizable">
    <div data-mr-handle="true"
      v-for="handle in handles"
      :key="handle"
      class="handle" :class="classes(handle)"
      :style="{ display: active ? 'block' : 'none'}">
    </div>
    </template>
    <div v-if="rotatble" data-rot-handle="true" class="handle o" :style="{ display: active ? 'block' : 'none'}">
    </div>
    <div v-if="!resizable"
      class="selection-box"
      :style="{ display: active ? 'block' : 'none'}">
    </div>
  </div>
</template>


<script>
export default {
  props: {
    active: {
      type: Boolean,
      default: false
    },
    elem: {
      type: Object,
      validator: function (val) {
        return (typeof val === 'object');
      }
    },
    containerProps: {
      type: Object,
      default: function () {
      }
    },
    handles: {
      type: Array,
      default: function () {
        return ['mt', 'mr', 'mb', 'ml', 'tl', 'tr', 'br', 'bl']
      }
    },
    rotatble: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    resizable () {
      return true;
    },
    style () {
      return {
        minWidth: this.elem.minWidth + 'px',
        minHeight: this.elem.minHeight + 'px',
        top: (typeof this.elem.y === 'number') ? (this.elem.y + 'px') : this.elem.y,
        left: (typeof this.elem.x === 'number') ? (this.elem.x + 'px') : this.elem.x,
        width: (typeof this.elem.width === 'number') ? (this.elem.width + 'px') : this.elem.width,
        height: (typeof this.elem.height === 'number') ? (this.elem.height + 'px') : this.elem.height,
        transform: 'rotate(' + this.elem.rotation + 'deg)'
      }
    }
  },
  methods: {
    /** Gets called when the user clicks on the element */
    onActivated(e) {
      this.$parent.onElementActivated( e, this.elem);   //notify parent
      this.$emit('activated', e, this.elem);            //notify app
    },
    classes (handle) {
      var cls = handle;
      if (this.elem.fixedRatio && handle.indexOf('m') !== -1) cls += ' dis';
      return cls;
    }
  }
}
</script>


<style scoped>
.element {
  position: absolute;
  box-sizing: border-box;
  border: 1px dashed #aaaaaa;
}
.element:hover {
  cursor: move;
}
.element > * {
  margin: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  box-sizing: border-box;
}

.element > .content {
  left: 0;
}

.selection-box {
  border: 2px solid #03a9f4;
}

.handle {
  box-sizing: border-box;
  display: none;
  position: absolute;
  width: 10px;
  height: 10px;
  font-size: 1px;
  border-radius: 50%;
  border: 1px solid #fff;
}
.handle.dis{
  pointer-events: none;
}
.tl {
  top: -3px;
  left: -3px;
  cursor: nwse-resize;
  background: #03a9f4;
}
.mt {
  top: 0;
  width: 100%;
  border-radius: 0;
  border-width: 2px;
  border-color: #03a9f4;
  border-style: solid none none none;
  cursor: ns-resize;
}
.tr {
  top: -3px;
  right: -3px;
  cursor: nesw-resize;
  background: #03a9f4;
}
.mr {
  top: 0;
  right: 0;
  height: 100%;
  border-radius: 0;
  border-width: 2px;
  border-color: #03a9f4;
  border-style: none solid none none;
  cursor: ew-resize;
}
.br {
  bottom: -3px;
  right: -3px;
  cursor: nwse-resize;
  background: #03a9f4;
}
.mb {
  bottom: 0;
  width: 100%;
  border-radius: 0;
  border-width: 2px;
  border-color: #03a9f4;
  border-style: none none solid none;
  cursor: ns-resize;
}
.bl {
  bottom: -3px;
  left: -3px;
  cursor: nesw-resize;
  background: #03a9f4;
}
.ml {
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 0;
  border-width: 2px;
  border-color: #03a9f4;
  border-style: none none none solid;
  cursor: ew-resize;
}
.o {
  top: -20px;
  left: calc(50% - 6px);
  cursor: alias;
  background: #03a9f4;
  width: 12px;
  height: 12px;
}
.o::after{
background: #03a9f4;
    height: 10px;
    width: 2px;
    top: 9px;
    left: 4px;
    position: absolute;
    content: "";
}
</style>

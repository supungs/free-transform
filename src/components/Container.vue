<template>
  <div class="container" data-container="true" tabindex="0"
    :style="styles"
    @mousedown.capture="onMouseDown">
    <slot/>
    <div ref="selectionArea" v-show="selecting" class="selection-area"></div>
  </div>
</template>

<script>
import { transformFrom, transformTo, doPolygonsIntersect } from '../helpers/transform.js';

export default {
  name: 'container',
  props: {
    width: {
      type: Number,
      default: 1000
    },
    height: {
      type: Number,
      default: 500
    },
    zoom: {
      type: Number,
      default: 1
    },
    elements: {
      type: Array,
      default() { return []; }
    },
    snapGrid: {
      type: Boolean,
      default: false
    },
    gridSize: {
      type: Number,
      default: 200
    }
  },
  data: function () {
    return {
      selectedElements: [],
      initialAbsPos: {x: 0, y: 0},
      initialRelPos: {x: 0, y: 0},
      currentAbsPos: {x: 0, y: 0},
      currentRelPos: {x: 0, y: 0},
      handleOffset: {x: 0, y: 0},
      selecting: false,
      moving: false,
      resizing: false,
      rotating: false,
      handle: null,
    }
  },
  computed: {
    styles () {
      return {
        height: (typeof this.height === 'string') ? this.height : (this.height + 'px'),
        width: (typeof this.width === 'string') ? this.width : (this.width + 'px'),
        transform: 'scale(' + this.zoom + ')',
        ...this.gridStyles
      }
    },
    gridStyles () {
      if (this.snapGrid) {
        return {
          backgroundSize: this.gridSize + 'px ' + this.gridSize + 'px',
          backgroundRepeat: 'repeat',
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.314) 1px, transparent 0px), linear-gradient(to bottom, rgba(0, 0, 0, 0.314) 1px, transparent 0px)',
          backgroundPosition: '0% 0%'
        }
      } else {
        return {};
      }
    },
    /** list of selected data elements and their dom elements */
    selectedDomElements () {
      return this.selectedElements.map(el => { 
        return {el: el, dom: document.getElementById('ft-' + el.id) }
      });
    },
    snapThreshold () {
      return this.gridSize / 20;
    },
    isMultiSelected () {
      return this.selectedElements.length > 1;
    }
  },
  methods: {
    /** Gets notified when the user clicks on an element */
    onElementActivated (e, elem) {
      e.stopPropagation();
      e.preventDefault();

      if (e.shiftKey && !elem.active) {
        this.selectedElements.push(elem);
        elem.active = true;
      } else if (!e.shiftKey && !elem.active) {
        this.clearSelection();
        this.selectedElements.push(elem);
        elem.active = true;
      }
    },
    onMouseDown (e) {
      let isMrs = false;  // whether move/resize or not
      this.initialAbsPos = this.currentAbsPos = this.getMouseAbsPoint(e);
      this.initialRelPos = this.currentRelPos = this.getMouseRelPoint(e);
      this.handleOffset = {x: e.offsetX, y: e.offsetY};

      if (e.target.dataset.container) {
        this.clearSelection();
        this.renderSelectionArea({x: -1, y: -1}, {x: -1, y: -1});
        isMrs = this.selecting = true;
      } else if (e.target.dataset.mrHandle) {
        isMrs = this.resizing = true
        this.handle = e.target.classList[1]  // keep track of the handle clicked
      } else if (e.target.dataset.rotHandle) {
        isMrs = this.rotating = true
      } else if (this.getParent(e.target)) {
        isMrs = this.moving = true
      }
      if (isMrs) {  //if move/resize
        document.documentElement.addEventListener('mousemove', this.onMouseMove, true);
        document.documentElement.addEventListener('mouseup', this.onMouseUp, true);
      }
    },
    onMouseMove (e) {
      this.currentAbsPos = this.getMouseAbsPoint(e);
      this.currentRelPos = this.getMouseRelPoint(e);

      let offX = this.currentAbsPos.x - this.initialAbsPos.x;
      let offY = this.currentAbsPos.y - this.initialAbsPos.y;

      // console.log(this.getMouseRelPoint(e));

      if (this.resizing) {
        this.selectedDomElements.map(item => {
          this.resizeElementBy(item.el, item.dom, offX, offY)
        });
      } else if (this.rotating) {
        // for rotation we need mouse offset from the begining of rotation (mouse down)
        this.selectedDomElements.map(item => {
          this.rotateElementBy(e, item.el, item.dom, offX, offY)
        });
      } else if (this.moving) {
        this.selectedDomElements.forEach(item => {
          this.moveElementBy(item.el, item.dom, offX, offY);
        });
      } else {
        this.renderSelectionArea(this.initialRelPos, this.currentRelPos);
      }
    },
    onMouseUp () {
      if (this.initialAbsPos !== this.currentAbsPos) {
        if (this.resizing) {
          this.selectedDomElements.map(item => {
            this.resizeStop(item.el, item.dom);
          });
        } else if (this.moving) {
          this.selectedDomElements.map(item => {
            this.moveStop(item.el, item.dom);
          });
        } else if (this.rotating) {
          this.selectedDomElements.map(item => {
            this.rotateStop(item.el, item.dom);
          });
        }
        else if (this.selecting) this.$emit('selectstop', this.selectStop())
      }
      this.moving = false;
      this.resizing = false;
      this.selecting = false;
      this.rotating = false;
      this.handle = null;

      document.documentElement.removeEventListener('mousemove', this.onMouseMove, true);
      document.documentElement.removeEventListener('mouseup', this.onMouseUp, true);
    },
    moveElementBy (elm, domEl, offX, offY) {
      const elCompStyle = window.getComputedStyle(domEl);
      let left = elm.x + Math.round(offX / this.zoom);
      let top = elm.y + Math.round(offY / this.zoom);
      let width = parseInt(elCompStyle.width);
      let height = parseInt(elCompStyle.height);
      let snapped = this.snapToGrid5(left, top, width, height, elm.rotation);
      
      domEl.style.left = snapped.x + 'px'; 
      domEl.style.top =  snapped.y + 'px'; 
    },
    resizeElementBy (elm, domEl, offX, offY) {
      var { rotation, minHeight, minWidth, fixedRatio } = elm;
      let newHeight = elm.height;
      let newWidth = elm.width;
      let newTop = elm.y;
      let newLeft = elm.x;
      let center = {x: newLeft + newWidth/2, y: newTop+ newHeight/2};
      let diffW = 0, diffH = 0;
      let signW = 1, signH = 1;

      //offsets in real coordinates has to be transformed to relative rotated coordinates of element
      let relOffset = transformTo(offX, offY, rotation);
      offX = Math.round(relOffset.x / this.zoom); // divide by zoom to get canvas space offset. so no need divide later
      offY = Math.round(relOffset.y / this.zoom);

      if (fixedRatio) { // when fixed ratio, both offsets has to be equal in size
        if (this.handle == 'tr' || this.handle == 'bl') { // but sign has to be opposit on tr and bl corners
          offX = (offX - offY)/2;
          offY = -offX;
        } else {
          offX = offY = (offX + offY)/2;
        }
      }
      // diffH & diffW are calculated as positive when dragging outwards
      if (this.handle.indexOf('t') !== -1) {  // resizing top side
        if (rotation % 360 == 0) offY = this.offsetToSnap(offY, elm.y); // snap top edge
        if (newHeight - offY < minHeight) offY = (newHeight - minHeight);
        diffH = -offY;
        signH = -1;   // new center should go up
      }
      else if (this.handle.indexOf('b') !== -1) {  // resizing bottom side
        if (rotation % 360 == 0) offY = this.offsetToSnap(offY, elm.y + elm.height); // snap bottom edge
        if (newHeight + offY < minHeight) offY = (minHeight - newHeight);
        diffH = offY;
        signH = 1   // new center should go down
      }
      if (this.handle.indexOf('l') !== -1) {  // resizing left side
        if (rotation % 360 == 0) offX = this.offsetToSnap(offX, elm.x); // snap left edge
        if (newWidth - offX < minWidth) offX = (newWidth - minWidth);
        diffW = -offX;
        signW = -1   // new center should go left
      }
      else if (this.handle.indexOf('r') !== -1) {  // resizing right side
        if (rotation % 360 == 0) offX = this.offsetToSnap(offX, elm.x + elm.width); // snap right edge
        if (newWidth + offX < minWidth) offX = (minWidth - newWidth);
        diffW = offX;
        signW = 1   // new center should go right
      }
      
      newHeight += diffH;
      newWidth += diffW;
      
      var newCenter = transformFrom(signW*diffW/2, signH*diffH/2, rotation).add(center);  //center has moved with new width,height
      var newLeftTop = newCenter.substract({x: newWidth/2, y: newHeight/2});  //new top-left corner according to new center

      domEl.style.height = parseInt(newHeight) + 'px';
      domEl.style.width = parseInt(newWidth) + 'px';
      domEl.style.top = parseInt(newLeftTop.y) + 'px';
      domEl.style.left = parseInt(newLeftTop.x) + 'px';
    },
    rotateElementBy (e, elm, domEl, offX, offY) {
      const elCompStyle = window.getComputedStyle(domEl);
      let newHeight = parseFloat(elCompStyle.height);
      let newWidth = parseFloat(elCompStyle.width);
      let newTop = parseFloat(elCompStyle.top);
      let newLeft = parseFloat(elCompStyle.left);

      let center = {x: newLeft + newWidth/2, y: newTop+ newHeight/2};
      let vec1 = {x: this.currentRelPos.x - center.x, y: this.currentRelPos.y - center.y};  //last mouse position vector
      let vec2 = {x: vec1.x - offX/this.zoom, y: vec1.y - offY/this.zoom};                  //current mouse position vector
      // let dot = vec1.x*vec2.x +  vec1.y*vec2.y;
      // let magnitude =  Math.sqrt(vec1.x*vec1.x + vec1.y*vec1.y) * Math.sqrt(vec2.x*vec2.x + vec2.y*vec2.y);
      //let rotOffset = Math.acos(dot/magnitude) / Math.PI * 180;

      //Take the difference of angles using tan inverse
      let rotOffset = (Math.atan2(vec1.y, vec1.x) - Math.atan2(vec2.y, vec2.x)) / Math.PI * 180;
      let newRotation = elm.rotation + rotOffset; //take the rotation at the begining + offset
      if (e.shiftKey && !this.isMultiSelected) {  //snap only for single sole elements
        let candidate = 30 * Math.round(newRotation/30);
        if (Math.abs(newRotation-candidate) < 10) newRotation = candidate;
      }
      domEl.style.transform = 'rotate(' + newRotation + 'deg)'
    },
    renderSelectionArea (initPoint, endPoint) {
      const minX = Math.min(initPoint.x, endPoint.x)
      const maxX = Math.max(initPoint.x, endPoint.x)
      const minY = Math.min(initPoint.y, endPoint.y)
      const maxY = Math.max(initPoint.y, endPoint.y)

      this.$refs.selectionArea.style.left = Math.round(minX) + 'px'
      this.$refs.selectionArea.style.top = Math.round(minY) + 'px'
      this.$refs.selectionArea.style.width = Math.round((maxX - minX)) + 'px'
      this.$refs.selectionArea.style.height = Math.round((maxY - minY)) + 'px'
    },
    moveStop (elm, domEl) {
      elm.x = parseInt(domEl.style.left);
      elm.y = parseInt(domEl.style.top);
    },
    resizeStop (elm, domEl) {
      elm.x = parseInt(domEl.style.left);
      elm.y = parseInt(domEl.style.top);
      elm.width = parseInt(domEl.style.width);
      elm.height = parseInt(domEl.style.height);
    },
    rotateStop (elm, domEl) {
      let transform = domEl.style.transform;
      let rotation = parseFloat(transform.replace('rotate(', ''));
      if(!isNaN(rotation)) elm.rotation = rotation;
    },
    selectStop () {
      let box = {
        top: parseInt(this.$refs.selectionArea.style.top),
        bottom: parseInt(this.$refs.selectionArea.style.height) + parseInt(this.$refs.selectionArea.style.top),
        left: parseInt(this.$refs.selectionArea.style.left),
        right: parseInt(this.$refs.selectionArea.style.width) + parseInt(this.$refs.selectionArea.style.left)
      };
      this.elements.forEach(elm => {
        // find the element's 4 corners in real coordinates
        let center = {x: elm.x + elm.width/2, y: elm.y + elm.height/2};
        let  p1 = transformFrom(-elm.width/2, -elm.height/2, elm.rotation).add(center);
        let  p2 = transformFrom(elm.width/2, -elm.height/2, elm.rotation).add(center);
        let  p3 = transformFrom(elm.width/2, elm.height/2, elm.rotation).add(center);
        let  p4 = transformFrom(-elm.width/2, elm.height/2, elm.rotation).add(center);
 
        let rec1 = [{x: box.left, y: box.top}, {x: box.right, y: box.top}, {x: box.right, y: box.bottom}, {x: box.rleftight, y: box.bottom}];
        let rec2 = [p1, p2, p3, p4];
        if (doPolygonsIntersect(rec1, rec2)) {  //check whether they intersect with a helper function
          this.selectedElements.push(elm);
          elm.active = true;
        }
      });
    },
    // snap a fixed + offset value and return the needed offset to snap
    offsetToSnap (off, fixed) {
      return this.snapToGrid1(fixed + off) - fixed;
    },
    snapToGrid1 (x) {
      var t = this.snapThreshold;
      var candidateX = this.gridSize * Math.round(x/this.gridSize);
      if (Math.abs(x-candidateX) < t) x = candidateX;
      return x;
    },
    snapToGrid2 (x, y) {
      var t = this.snapThreshold;
      var candidateX = this.gridSize * Math.round(x/this.gridSize);
      var candidateY = this.gridSize * Math.round(y/this.gridSize);
      if (Math.abs(x-candidateX) < t) x = candidateX;
      if (Math.abs(y-candidateY) < t) y = candidateY;
      return {x, y};
    },
    snapToGrid4 (x, y, w, h) {
      var t = this.snapThreshold;
      var candidateX1 = this.gridSize * Math.round(x/this.gridSize);
      var candidateY1 = this.gridSize * Math.round(y/this.gridSize);
      var candidateX2 = this.gridSize * Math.round((x+w)/this.gridSize) - w;
      var candidateY2 = this.gridSize * Math.round((y+h)/this.gridSize) - h;
      if (Math.abs(x-candidateX1) < t) x = candidateX1;
      else if (Math.abs(x-candidateX2) < t) x = candidateX2;
      if (Math.abs(y-candidateY1) < t) y = candidateY1;
      else if (Math.abs(y-candidateY2) < t) y = candidateY2;
      return {x, y};
    },
    /** Snap rotated elements */
    snapToGrid5 (x, y, w, h, r) {
      if (!this.snapGrid) return {x, y};  //disabled

      let center = {x: x + w/2, y: y + h/2};
      let snapOffset = { x: 0, y: 0};

      for (let i = -1; i <= 1; i += 2) {  //for each corner in rotated coordinates
        for (let j = -1; j <= 1; j += 2) {
          let temp = transformFrom(i*w/2, j*h/2, r).add(center);  //transform to real coordinates
          let corner = this.snapToGrid2(temp.x, temp.y);          //snap corner to grid 
          if (temp.x != corner.x) snapOffset.x = (corner.x - temp.x);
          if (temp.y != corner.y) snapOffset.y = (corner.y - temp.y);
        }
      }
      // parse to int is important
      return {x: parseInt(x + snapOffset.x), y: parseInt(y + snapOffset.y)};
    },
    /** Clear selection. */
    clearSelection () {
      this.selectedElements.forEach(el => {
        el.active = false;
      });
      this.selectedElements = [];
    },
    getMouseAbsPoint (e) {
      return {x: e.clientX, y: e.clientY};
    },
    getMouseRelPoint (e) {
      var viewportOffset = this.$el.getBoundingClientRect();  //get container position relative to browser window
      const x = e.clientX - viewportOffset.x;
      const y = e.clientY - viewportOffset.y;
      return {x: Math.round(x / this.zoom), y: Math.round(y / this.zoom)};
    },
    /** get parent container element. */
    getParent (element) {
      let parent = null
      let current = element

      while (parent === null) {
        if (current === null || current.parentElement === null) break
        else if (current.dataset.container) parent = current
        else if (current.parentElement.dataset.element) parent = current.parentElement

        current = current.parentElement
      }
      return parent
    }
  }
}
</script>

<style lang="scss" scoped>
.container{
  border: 1px solid black;
  position: relative;
  width: 1000px;
  height: 500px;;
}
.selection-area {
  position: absolute;
  border: 1px solid #03a9f4;
  background-color: rgba(3, 169, 244, .08);
}
</style>
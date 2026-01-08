<template>
  <div class="container-fluid">
    <div class="row main-row">
      <!-- Left Column -->
      <div class="col-xs-3 sidebar">
        <!-- Main Navigation -->
        <div>{{ displayText }}</div>
        <ul class="nav nav-sidebar">
          <li :class="{active: activeTab === 'floorplan'}" @click="setTab('floorplan')">
            <a href="#">Edit Floorplan <span class="glyphicon glyphicon-chevron-right pull-right"></span></a>
          </li>
          <li :class="{active: activeTab === 'design'}" @click="setTab('design')">
            <a href="#">Design <span class="glyphicon glyphicon-chevron-right pull-right"></span></a>
          </li>
          <li :class="{active: activeTab === 'items'}" @click="setTab('items')">
            <a href="#">Add Items <span class="glyphicon glyphicon-chevron-right pull-right"></span></a>
          </li>
        </ul>
        <hr />
        <!-- Context Menu -->
        <div id="context-menu" v-if="showContextMenu">
          <div style="margin: 0 20px">
            <span id="context-menu-name" class="lead">{{ contextMenuName }}</span>
            <br /><br />
            <button class="btn btn-block btn-danger" @click="deleteItem">
              <span class="glyphicon glyphicon-trash"></span> Delete Item
            </button>
            <br />
            <div class="panel panel-default">
              <div class="panel-heading">Adjust Size</div>
              <div class="panel-body" style="color: #333333">
                <div class="form form-horizontal lead">
                  <div class="form-group">
                    <label class="col-sm-5 control-label">Width</label>
                    <div class="col-sm-6">
                      <input type="number" class="form-control" v-model="itemWidth">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="col-sm-5 control-label">Depth</label>
                    <div class="col-sm-6">
                      <input type="number" class="form-control" v-model="itemDepth">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="col-sm-5 control-label">Height</label>
                    <div class="col-sm-6">
                      <input type="number" class="form-control" v-model="itemHeight">
                    </div>
                  </div>
                </div>
                <small><span class="text-muted">Measurements in inches.</span></small>
              </div>
            </div>
            <label><input type="checkbox" v-model="itemLocked" /> Lock in place</label>
            <br /><br />
          </div>
        </div>
        <!-- Floor textures -->
        <div id="floorTexturesDiv" v-if="activeTab === 'design'" style="padding: 0 20px">
          <div class="panel panel-default">
            <div class="panel-heading">Adjust Floor</div>
            <div class="panel-body" style="color: #333333">
              <div class="col-sm-6" style="padding: 3px">
                <a href="#" class="thumbnail texture-select-thumbnail" @click.prevent="selectFloorTexture('light_fine_wood')">
                  <img alt="Thumbnail light fine wood" src="/HyTheme/blueprint3d/rooms/thumbnails/thumbnail_light_fine_wood.jpg" />
                </a>
              </div>
            </div>
          </div>
        </div>
        <!-- Wall Textures -->
        <div id="wallTextures" v-if="activeTab === 'design'" style="padding: 0 20px">
          <div class="panel panel-default">
            <div class="panel-heading">Adjust Wall</div>
            <div class="panel-body" style="color: #333333">
              <div class="col-sm-6" style="padding: 3px" v-for="texture in wallTextures" :key="texture.name">
                <a href="#" class="thumbnail texture-select-thumbnail" @click.prevent="selectWallTexture(texture)">
                  <img :alt="texture.name" :src="texture.thumbnail" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Right Column -->
      <div class="col-xs-9 main">
        <!-- 3D Viewer -->
        <div id="viewer">
          <div id="main-controls">
            <a href="#" class="btn btn-default btn-sm" @click="newPlan">New Plan</a>
            <a href="#" class="btn btn-default btn-sm" @click="savePlan">Save Plan</a>
            <a class="btn btn-sm btn-default btn-file">
              <input type="file" class="hidden-input" @change="loadPlan">
              Load Plan
            </a>
          </div>
          <div id="camera-controls">
            <a href="#" class="btn btn-default bottom" @click="zoomOut"><span class="glyphicon glyphicon-zoom-out"></span></a>
            <a href="#" class="btn btn-default bottom" @click="resetView"><span class="glyphicon glyphicon-home"></span></a>
            <a href="#" class="btn btn-default bottom" @click="zoomIn"><span class="glyphicon glyphicon-zoom-in"></span></a>
            <span>&nbsp;</span>
            <a class="btn btn-default bottom" href="#" @click="moveLeft"><span class="glyphicon glyphicon-arrow-left"></span></a>
            <span class="btn-group-vertical">
              <a class="btn btn-default" href="#" @click="moveUp"><span class="glyphicon glyphicon-arrow-up"></span></a>
              <a class="btn btn-default" href="#" @click="moveDown"><span class="glyphicon glyphicon-arrow-down"></span></a>
            </span>
            <a class="btn btn-default bottom" href="#" @click="moveRight"><span class="glyphicon glyphicon-arrow-right"></span></a>
          </div>
          <div id="loading-modal" v-if="loading">
            <h1>Loading...</h1>
          </div>
        </div>
        <!-- 2D Floorplanner -->
        <div id="floorplanner" v-if="activeTab === 'floorplan'">
          <canvas id="floorplanner-canvas"></canvas>
          <div id="floorplanner-controls">
            <button id="move" class="btn btn-sm btn-default" @click="moveWalls"><span class="glyphicon glyphicon-move"></span> Move Walls</button>
            <button id="draw" class="btn btn-sm btn-default" @click="drawWalls"><span class="glyphicon glyphicon-pencil"></span> Draw Walls</button>
            <button id="delete" class="btn btn-sm btn-default" @click="deleteWalls"><span class="glyphicon glyphicon-remove"></span> Delete Walls</button>
            <span class="pull-right">
              <button class="btn btn-primary btn-sm" @click="updateFloorplan">Done &raquo;</button>
            </span>
          </div>
          <div id="draw-walls-hint">Press the "Esc" key to stop drawing walls</div>
        </div>
        <!-- Add Items -->
        <div id="add-items" v-if="activeTab === 'items'">
          <div class="row" id="items-wrapper">
            <!-- Items added here by items.js -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BlueprintComponent',
  props: {
    displayText: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      activeTab: 'floorplan',
      showContextMenu: false,
      contextMenuName: '',
      itemWidth: 0,
      itemDepth: 0,
      itemHeight: 0,
      itemLocked: false,
      wallTextures: [
        { name: 'marbletiles', thumbnail: '/HyTheme/blueprint3d/rooms/thumbnails/thumbnail_marbletiles.jpg' },
        { name: 'wallmap yellow', thumbnail: '/HyTheme/blueprint3d/rooms/thumbnails/thumbnail_wallmap_yellow.png' },
        { name: 'light brick', thumbnail: '/HyTheme/blueprint3d/rooms/thumbnails/thumbnail_light_brick.jpg' }
      ],
      loading: false
    };
  },
  methods: {
    setTab(tab) {
      this.activeTab = tab;
    },
    deleteItem() {
      // Implement item deletion logic
    },
    selectFloorTexture(texture) {
      // Implement floor texture selection logic
    },
    selectWallTexture(texture) {
      // Implement wall texture selection logic
    },
    newPlan() {
      // Implement new plan logic
    },
    savePlan() {
      // Implement save plan logic
    },
    loadPlan(event) {
      // Implement load plan logic
    },
    zoomOut() {
      // Implement zoom out logic
    },
    resetView() {
      // Implement reset view logic
    },
    zoomIn() {
      // Implement zoom in logic
    },
    moveLeft() {
      // Implement move left logic
    },
    moveUp() {
      // Implement move up logic
    },
    moveDown() {
      // Implement move down logic
    },
    moveRight() {
      // Implement move right logic
    },
    moveWalls() {
      // Implement move walls logic
    },
    drawWalls() {
      // Implement draw walls logic
    },
    deleteWalls() {
      // Implement delete walls logic
    },
    updateFloorplan() {
      // Implement update floorplan logic
    }
  },
  mounted() {
    // Integrate blueprint3d and other JS libraries here
    // e.g. window.Blueprint3D.init(...)
  }
};
</script>

<style scoped>
@import url("~/HyTheme/blueprint3d/css/bootstrap.css");
@import url("~/HyTheme/blueprint3d/css/example.css");

.container-fluid { padding: 0; }
.sidebar { background: #f8f8f8; min-height: 100vh; }
.main { background: #fff; min-height: 100vh; }
#viewer { min-height: 400px; background: #eaeaea; }
#loading-modal { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 2em; border-radius: 8px; z-index: 1000; }
</style>

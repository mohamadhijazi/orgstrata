// add items to the "Add Items" tab

$(document).ready(function() {
  var items = [
   {
      "name" : "Closed Door",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_Screen_Shot_2014-10-27_at_8.04.12_PM.png",
      "model" : "/HyTheme/blueprint3d/models/js/closed-door28x80_baked.js",
      "type" : "7"
    }, 
    {
      "name" : "Open Door",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_Screen_Shot_2014-10-27_at_8.22.46_PM.png",
      "model" : "/HyTheme/blueprint3d/models/js/open_door.js",
      "type" : "7"
    }, 
    {
      "name" : "Window",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_window.png",
      "model" : "/HyTheme/blueprint3d/models/js/whitewindow.js",
      "type" : "3"
    }, 
    {
      "name" : "Chair",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_Church-Chair-oak-white_1024x1024.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/gus-churchchair-whiteoak.js",
      "type" : "1"
    }, 
    {
      "name" : "Red Chair",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_tn-orange.png",
      "model" : "/HyTheme/blueprint3d/models/js/ik-ekero-orange_baked.js",
      "type" : "1"
    },
    {
      "name" : "Blue Chair",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_ekero-blue3.png",
      "model" : "/HyTheme/blueprint3d/models/js/ik-ekero-blue_baked.js",
      "type" : "1"
    },
    {
      "name" : "Dresser - Dark Wood",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_matera_dresser_5.png",
      "model" : "/HyTheme/blueprint3d/models/js/DWR_MATERA_DRESSER2.js",
      "type" : "1"
    }, 
    {
      "name" : "Dresser - White",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_img25o.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/we-narrow6white_baked.js",
      "type" : "1"
    },  
    {
      "name" : "Bedside table - Shale",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_Blu-Dot-Shale-Bedside-Table.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/bd-shalebedside-smoke_baked.js",
      "type" : "1"
    }, 
    {
      "name" : "Bedside table - White",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_arch-white-oval-nightstand.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/cb-archnight-white_baked.js",
      "type" : "1"
    }, 
    {
      "name" : "Wardrobe - White",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_TN-ikea-kvikine.png",
      "model" : "/HyTheme/blueprint3d/models/js/ik-kivine_baked.js",
      "type" : "1"
    }, 
    {
      "name" : "Full Bed",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_nordli-bed-frame__0159270_PE315708_S4.JPG",
      "model" : "/HyTheme/blueprint3d/models/js/ik_nordli_full.js",
      "type" : "1"
    }, 
    {
      "name" : "Bookshelf",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_kendall-walnut-bookcase.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/cb-kendallbookcasewalnut_baked.js",
      "type" : "1"
    }, 
        {
      "name" : "Media Console - White",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_clapboard-white-60-media-console-1.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/cb-clapboard_baked.js",
      "type" : "1"
    }, 
        {
      "name" : "Media Console - Black",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_moore-60-media-console-1.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/cb-moore_baked.js",
      "type" : "1"
    }, 
       {
      "name" : "Sectional - Olive",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_img21o.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/we-crosby2piece-greenbaked.js",
      "type" : "1"
    }, 
    {
      "name" : "Sofa - Grey",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_rochelle-sofa-3.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/cb-rochelle-gray_baked.js",
      "type" : "1"
    }, 
        {
      "name" : "Wooden Trunk",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_teca-storage-trunk.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/cb-tecs_baked.js",
      "type" : "1"
    }, 
        {
      "name" : "Floor Lamp",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_ore-white.png",
      "model" : "/HyTheme/blueprint3d/models/js/ore-3legged-white_baked.js",
      "type" : "1"
    },
    {
      "name" : "Coffee Table - Wood",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_stockholm-coffee-table__0181245_PE332924_S4.JPG",
      "model" : "/HyTheme/blueprint3d/models/js/ik-stockholmcoffee-brown.js",
      "type" : "1"
    }, 
    {
      "name" : "Side Table",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_Screen_Shot_2014-02-21_at_1.24.58_PM.png",
      "model" : "/HyTheme/blueprint3d/models/js/GUSossingtonendtable.js",
      "type" : "1"
    }, 
    {
      "name" : "Dining Table",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_scholar-dining-table.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/cb-scholartable_baked.js",
      "type" : "1"
    }, 
    {
      "name" : "Dining table",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_Screen_Shot_2014-01-28_at_6.49.33_PM.png",
      "model" : "/HyTheme/blueprint3d/models/js/BlakeAvenuejoshuatreecheftable.js",
      "type" : "1"
    },
    {
      "name" : "Blue Rug",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_cb-blue-block60x96.png",
      "model" : "/HyTheme/blueprint3d/models/js/cb-blue-block-60x96.js",
      "type" : "8"
    },
    {
      "name" : "NYC Poster",
      "image" : "/HyTheme/blueprint3d/models/thumbnails/thumbnail_nyc2.jpg",
      "model" : "/HyTheme/blueprint3d/models/js/nyc-poster2.js",
      "type" : "2"
    }
   /*     
   {
      "name" : "",
      "image" : "",
      "model" : "",
      "type" : "1"
    }, 
    */
  ]



  var itemsDiv = $("#items-wrapper")
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var html = '<div class="col-sm-4">' +
                '<a class="thumbnail add-item" model-name="' + 
                item.name + 
                '" model-url="' +
                item.model +
                '" model-type="' +
                item.type + 
                '"><img src="' +
                item.image + 
                '" alt="Add Item"> '+
                item.name +
                '</a></div>';
    itemsDiv.append(html);
  }
});
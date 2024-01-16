/*
 * canvasprint.js
 * version 0.1
 *
 * Author: Rylan Santinon
 */

var Canvasprint = (function(Canvasprint) {
  'use strict';
  Canvasprint = function (){};

  Canvasprint.prototype = {
    get: function (){
      var print = 0;
      print = this.getPrint();
      return this.hash(print);
    },

    hash: function(base64){
      var hash = 3001, i, len, string = atob(base64);
      if (string.length == 0) return hash;
      for (i = 0, len = string.length; i < len; i++){
	hash = ((hash << 5) - hash) + (string.charCodeAt(i) * 47);
	hash ^= 0x7fffffff;
	hash |= 0;
      }
      return hash;
    },

    writeOnContext: function(context, string, typeface, color, x, y){
      context.font = "14px " + typeface;
      context.fillStyle = color;
      context.fillText(string, x, y);
    },

    getPrint: function() {
      var canv = document.createElement('canvas');
      var context = canv.getContext('2d');

      var grad = context.createLinearGradient(0,0,70,70);
      grad.addColorStop(0, "#dddedf");
      grad.addColorStop(1, "#5062A4");
      context.fillStyle = grad;
      context.fillRect(0, 0, 60, 60);

      var txt = 'canvasprint.js 个個칼'
      var typefaces = ["sans-serif", "serif", "fantasy", "cursive", "monospace", "-no-font-"];
      for (var i = 0; i < typefaces.length; i++){
	var y = 10 + (6 * i);
	var x = i;
	this.writeOnContext(context, txt, typefaces[i], "rgba(202,56,202,0.53)",x,y);
      }
      return canv.toDataURL().replace("data:image/png;base64,","");
    }
  };
  return Canvasprint;
})({});

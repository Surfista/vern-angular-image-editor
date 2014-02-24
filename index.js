'use strict';

/**
 *  VERN Image Editor directive
 *
 *  Allow basic editing of images directly in the browser. Apply attribute to an img tag. 
 *
 *  Attributes:
 *  image-editor, eg: "/path/to/modal/template"
 *
 *  templateUrl, the template to override the default, eg: "/path/to/template"
 *
 *  callback, a scope function that will parse the saved data "updateFile(base64, src, type)"
 *
 *  src, the image source, needs to have proper CORS attributes in request set
 *
 */

angular.module('vern.imageEditor', [])
  .directive('imageEditor', ['$compile', '$http', '$templateCache', function($compile, $http, $templateCache) {
    var tURL, loader, defaultTemplateUrl = 'public/image-editor.html';

    return {
      restrict: 'A',
      replace: true,
      transclude: true,
      scope: {src: '@', callback: '&callback'},
      templateUrl: function(tElement, tAttr) {
        tURL = defaultTemplateUrl;
        if(tAttr.templateUrl) {
          tURL = tAttr.templateUrl;
        }
        return tURL;
      },
      link: function(scope, elm, attrs, ctrl) {
        scope.showEditor = false;
        var canvas = elm.find('.img-src');
        var selection = elm.find('.selection');
        var canvasElm = canvas[0];
        var editor = elm.find('.img-editor');
        var context = canvasElm.getContext("2d");
        var imgElm;
        var imgType = 'image/png';
        scope.$watch('src', function() {
          if(!scope.src) {
            return;
          }

          $http.get(scope.src).success(function(data, status, headers, config) {
            imgType = headers()['content-type'];
          });
          imgElm = new Image();
          imgElm.crossOrigin = 'vern';
          imgElm.onload = function() {
            if(scope.showEditor) {
              scope.openEditor();
            }
          };
          imgElm.src = scope.src;
          elm.find('.img-editor').append(imgElm);
        });

        scope.size = {
          width: null,
          height: null
        };
        scope.crop = {
          width: null,
          height: null
        };
        scope.cropLock = {
          width: null,
          height: null
        };
        scope.showSize = true;
        scope.aspectRatio = true;
        scope.cropRatio = false;

        scope.toggleAspectRatio = function() {
          scope.aspectRatio = !scope.aspectRatio;
        };
        scope.toggleCropRatio = function() {
          scope.cropRatio = !scope.cropRatio;
          if(scope.cropRatio) {
            scope.cropLock.width = selection.width();
            scope.cropLock.height = selection.height();
          }
        };
        var dragging = false;
        var x1,y1,x2,y2,originOffset,containerOffset;

        selection.on('mousedown', function(evt) {
          dragging = true;
          originOffset = selection.position();
          containerOffset = canvas.position();
          var x = evt.pageX;
          var y = evt.pageY;
          x1 = x - originOffset.left;
          y1 = y - originOffset.top;
        });

        elm.on('mousemove', function(evt) {
          if(!dragging) {
            return;
          }

          evt.preventDefault();

          var offset = selection.position();
          var x = evt.pageX;
          var y = evt.pageY;
          x2 = x - offset.left - x1;
          y2 = y - offset.top - y1;

          if((offset.left + x2) < containerOffset.left) {
            x2 = containerOffset.left - offset.left;
          }
          if((offset.top + y2) < containerOffset.top) {
            y2 = containerOffset.top - offset.top;
          }
          if((offset.left + parseInt(scope.crop.width, 10) + x2) > (containerOffset.left + parseInt(scope.size.width, 10))) {
            x2 = (containerOffset.left + parseInt(scope.size.width, 10)) - (offset.left + parseInt(scope.crop.width, 10));
          }
          if((offset.top + parseInt(scope.crop.height, 10) + y2) > (containerOffset.top + parseInt(scope.size.height, 10))) {
            y2 = (containerOffset.top + parseInt(scope.size.height, 10)) - (offset.top + parseInt(scope.crop.height, 10));
          }
          selection.css({
            marginLeft: 0,
            left: (offset.left + editor.scrollLeft() + x2) + 'px',
            top: (offset.top + editor.scrollTop() + y2) + 'px'
          });
        });

        elm.on('mouseup', function(evt) {
          dragging = false;
        });

        scope.setCropSize = function() {
          return {
            display: scope.showSize ? 'none' : 'block',
            width: scope.crop.width,
            height: scope.crop.height
          };
        };

        scope.setSizeAction = function(s) {
          scope.showSize = s;
          if(s === false) {
            scope.crop.width = scope.size.width;
            scope.crop.height = scope.size.height;
            selection.css({
              left: 'calc(50% - ' + (scope.size.width/2) + 'px)',
              top: 'auto'
            });
          }
        };

        scope.openEditor = function() {
          scope.showEditor = true;

          scope.size.width = imgElm.width;
          scope.size.height = imgElm.height;
          [canvas,selection].forEach(function(s, i) {
            s.css({
              width: imgElm.width,
              height: imgElm.height,
              left: 'calc(50% - ' + (imgElm.width/2) + 'px)',
              top: 'auto'
            });
          });
          context.canvas.width = imgElm.width;
          context.canvas.height = imgElm.height;
          context.drawImage(imgElm, 0, 0);
        };

        scope.resize = function() {
          canvas.css({
            width: scope.size.width,
            height: scope.size.height,
            left: 'calc(50% - ' + (scope.size.width/2) + 'px)'
          });
          context.canvas.width = scope.size.width;
          context.canvas.height = scope.size.height;
          context.drawImage(imgElm, 0, 0, scope.size.width, scope.size.height);
        };

        scope.closeEditor = function() {
          scope.showEditor = false;
        };

        scope.saveImage = function() {
          if(!scope.showSize) {
            // save cropped size
            var pos = selection.position();
            var base = canvas.position();
            var x1 = pos.left - base.left;
            var x2 = pos.top - base.top;

            var c2 = angular.element('<canvas></canvas>');
            angular.element('body').append(c2);
            var c2x = c2[0].getContext('2d');
            c2x.canvas.width = scope.crop.width;
            c2x.canvas.height = scope.crop.height;
            c2x.drawImage(canvasElm, x1, x2, scope.crop.width, scope.crop.height, 0, 0, scope.crop.width, scope.crop.height);
            var content = c2[0].toDataURL(imgType);
            c2.remove();
            scope.callback({base64: content, src: scope.src, type: imgType});
          } else {
            var content = canvasElm.toDataURL(imgType);
            scope.callback({base64: content, src: scope.src, type: imgType});
          }
        };

        scope.$watch('size', function(newSize, oldSize) {
          if(scope.size.width === null) {
            return;
          }

          if(oldSize.width !== newSize.width) {
            if(scope.aspectRatio) {
              scope.size.height = parseInt(imgElm.height / imgElm.width * parseInt(newSize.width, 10), 10);
            }

            scope.size.width = parseInt(newSize.width, 10);
          } else if(oldSize.height !== newSize.height) {
            if(scope.aspectRatio) {
              scope.size.width = parseInt(imgElm.width / imgElm.height * parseInt(newSize.height, 10), 10);
            }
            scope.size.height = parseInt(newSize.height, 10);
          }

          scope.resize();
        }, true);

        scope.$watch('crop', function(newSize, oldSize) {
          if(scope.crop.width === null) {
            return;
          }

          if(oldSize.width !== newSize.width) {
            if(scope.cropRatio) {
              scope.crop.height = parseInt(scope.cropLock.height / scope.cropLock.width * parseInt(newSize.width, 10), 10);
            }

            scope.crop.width = parseInt(newSize.width, 10);
          } else if(oldSize.height !== newSize.height) {
            if(scope.cropRatio) {
              scope.crop.width = parseInt(scope.cropLock.width / scope.cropLock.height * parseInt(newSize.height, 10), 10);
            }
            scope.crop.height = parseInt(newSize.height, 10);
          }
        }, true);

      }
    };
  }]);
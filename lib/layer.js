/*
 * Mini-express
 * Author: @miaoever
 * Email: leo.miao.ever@gmail.com
 */
var p2re = require("path-to-regexp");

var layer = function(route, fn, opt) {
  this.route = route;
  this.handle = fn;
  this.opt = opt || false;
}

var _removeTrailingSlash = function (url) {
  return url[url.length - 1] === '/' ? url.substr(0,url.length -1) : url;
}

var _removeStartingSlash = function (url) {
  return url[0] === '/' ? url.substr(1, url.length -1) : url;
}

layer.prototype.match = function (reqUrl) {
  reqUrl = decodeURIComponent(_removeTrailingSlash(reqUrl));
  var route = _removeTrailingSlash(this.route);
  var paramNames = [];
  var re = p2re(route, paramNames,{end: this.opt}); // end : false - prefix matching, true - not prefix mathcing

  if (!re.test(reqUrl)) {
    return undefined;
  }
  var m = re.exec(reqUrl);
  var param = {
    'path'  : m[0],
    'params': {}
  };

  for (var i = 0; i < paramNames.length ; i++) {
    param.params[paramNames[i].name] = m[1+i];
  }

  return param;
}

module.exports = layer;

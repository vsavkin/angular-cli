"use strict";
var fs = require('fs');
var noop = function () { };
var webpackContext = {
    cacheable: noop,
    exec: noop,
    async: noop
};
var WebpackResourceLoader = (function () {
    function WebpackResourceLoader(compiler) {
        this.compiler = compiler;
    }
    WebpackResourceLoader.prototype.get = function (filePath) {
        return Promise.resolve(fs.readFileSync(filePath, 'utf-8'));
    };
    WebpackResourceLoader.prototype.transform = function (resource) {
        return resource;
    };
    return WebpackResourceLoader;
}());
exports.WebpackResourceLoader = WebpackResourceLoader;

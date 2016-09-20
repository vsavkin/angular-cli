"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require('./codegen'));
__export(require('./plugin'));
var loader_1 = require('./loader');
exports.default = loader_1.ngcLoader;

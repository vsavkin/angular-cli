"use strict";
var ts = require('typescript');
function ngcLoader(sourceFile) {
    return ts.transpileModule(sourceFile, { compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ES2015 } }).outputText;
}
exports.ngcLoader = ngcLoader;

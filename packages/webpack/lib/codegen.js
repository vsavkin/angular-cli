"use strict";
var Rx_1 = require('rxjs/Rx');
var ts = require('typescript');
var ngCompiler = require('@angular/compiler-cli');
function _readConfig(tsConfigPath) {
    var _a = ts.readConfigFile(tsConfigPath, ts.sys.readFile), config = _a.config, error = _a.error;
    if (error) {
        throw error;
    }
    return config;
}
function createCodeGenerator(_a) {
    var ngcOptions = _a.ngcOptions, i18nOptions = _a.i18nOptions, resourceLoader = _a.resourceLoader, compilerHost = _a.compilerHost;
    return function (program) { return new Rx_1.Observable(function (codegenOutput) {
        //emit files from observable monkeypatch
        var writeFile = compilerHost.writeFile;
        compilerHost.writeFile = function (fileName, sourceText) {
            writeFile(fileName, sourceText);
            codegenOutput.next({ fileName: fileName, sourceText: sourceText });
        };
        var codeGenerator = ngCompiler.CodeGenerator.create(ngcOptions, i18nOptions, program, compilerHost, undefined, //TODO: hook in reflector host
        resourceLoader);
        codeGenerator
            .codegen().then(function () {
            program.emit();
            codegenOutput.complete();
        }, function (err) { return codegenOutput.error(err); });
    }); };
}
exports.createCodeGenerator = createCodeGenerator;

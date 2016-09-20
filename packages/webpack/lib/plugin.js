"use strict";
//@angular/webpack plugin main
require('reflect-metadata');
var ts = require('typescript');
var ngCompiler = require('@angular/compiler-cli');
var codegen_1 = require('./codegen');
function debug() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    console.log.apply(console, ['ngc:'].concat(args));
}
var noTransformExtensions = ['.html', '.css'];
var NgcWebpackPlugin = (function () {
    function NgcWebpackPlugin(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        var tsConfig = this._readConfig(options.project);
        var plugin = this;
        var ngcConfig = tsConfig.angularCompilerOptions;
        if (!ngcConfig) {
            throw new Error("\"angularCompilerOptions\" is not set in your tsconfig file!");
        }
        var _a = ngcConfig.entryModule.split('#'), rootModule = _a[0], rootNgModule = _a[1];
        this.rootModule = rootModule;
        this.rootModuleName = rootNgModule;
        var compilerHost = ts.createCompilerHost(tsConfig.compilerOptions, true);
        console.log("createProgram", rootModule, this.rootModule, tsConfig.compilerOptions);
        //create a program that references the main JIT entry point (eg the main AppModule), as we need that reference for codegen
        this.program = ts.createProgram([this.rootModule + '.ts'], tsConfig.compilerOptions, compilerHost);
        console.log("done creating the program");
        var basePath = process.cwd();
        //options for codegen
        var ngcOptions = {
            genDir: ngcConfig.genDir,
            rootDir: tsConfig.compilerOptions.rootDir,
            basePath: basePath,
            skipMetadataEmit: true,
            skipDefaultLibCheck: true,
            skipTemplateCodegen: false,
            trace: true,
            strictMetadataEmit: true
        };
        //TODO:i18n setup
        var i18nOptions = {
            i18nFile: undefined,
            i18nFormat: undefined,
            locale: undefined,
            basePath: basePath
        };
        this.reflectorHost = new ngCompiler.ReflectorHost(this.program, compilerHost, ngcOptions);
        this.reflector = new ngCompiler.StaticReflector(this.reflectorHost);
        this.codeGeneratorFactory = codegen_1.createCodeGenerator({ ngcOptions: ngcOptions, i18nOptions: i18nOptions, compilerHost: compilerHost, resourceLoader: undefined });
    }
    //registration hook for webpack plugin
    NgcWebpackPlugin.prototype.apply = function (compiler) {
        var _this = this;
        compiler.plugin('compile', function (params) { return _this._compile(params); });
        compiler.plugin('make', function (compilation, cb) { return _this._make(compilation, cb); });
        compiler.plugin('run', function (compiler, cb) { return _this._run(compiler, cb); });
        compiler.plugin('watch-run', function (compiler, cb) { return _this._watch(compiler, cb); });
        compiler.plugin('compilation', function (compilation) { return _this._compilation(compilation); });
    };
    NgcWebpackPlugin.prototype._make = function (compilation, cb) {
        //TODO: vsavkin verify that the last param is not needed
        var entryModule = this.reflectorHost.findDeclaration("./" + this.rootModule, this.rootModuleName, "/Users/vsavkin/projects/angular-cli/packages/webpack/test/index.ts");
        //TODO: vsavkin find the right annotation instead of taking the last one
        console.log("REFLECT", global.Reflect);
        var entryNgModuleMetadata = this.reflector.annotations(entryModule).pop();
        // console.log("CCC", this.reflector.annotations(entryModule).length)
        // //TODO vsavkin scan providers and imports
        // const entryModules = entryNgModuleMetadata.imports
        //   .filter(importRec => importRec.ngModule && importRec.ngModule.name === 'RouterModule')
        //   .map(routerModule => routerModule.providers)
        // //TODO given the opaque token (loadChidlren), can we get its filename?
        // debug(`ngc: building from ${entryModule.name}`)
        // this.codeGeneratorFactory(this.program)
        //   .forEach(v => console.log(v.fileName))
        //   .then(
        //     () => cb(),
        //     err => cb(err)
        //   )
        cb();
    };
    NgcWebpackPlugin.prototype._resolve = function (compiler, resolver, requestObject, cb) {
        cb();
    };
    NgcWebpackPlugin.prototype._run = function (compiler, cb) {
        cb();
    };
    NgcWebpackPlugin.prototype._watch = function (watcher, cb) {
        this._run(watcher.compiler, cb);
    };
    NgcWebpackPlugin.prototype._readConfig = function (tsConfigPath) {
        var _a = ts.readConfigFile(tsConfigPath, ts.sys.readFile), config = _a.config, error = _a.error;
        if (error) {
            throw error;
        }
        // TODO: vsavkin add error handling
        return {
            compilerOptions: ts.parseJsonConfigFileContent(config, new ParseConfigHost(), "").options,
            angularCompilerOptions: config.angularCompilerOptions
        };
    };
    NgcWebpackPlugin.prototype._compile = function (params) {
        //console.log(params)
        // params.resolvers.normal.fileSystem = this.fileCache;
        // params.resolvers.context.fileSystem = this.fileCache;
        // params.resolvers.loader.fileSystem = this.fileCache;
    };
    NgcWebpackPlugin.prototype._compilation = function (compilation) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
    };
    return NgcWebpackPlugin;
}());
exports.NgcWebpackPlugin = NgcWebpackPlugin;
var ParseConfigHost = (function () {
    function ParseConfigHost() {
        this.useCaseSensitiveFileNames = true;
    }
    ParseConfigHost.prototype.readDirectory = function (rootDir, extensions, excludes, includes) {
        return ts.sys.readDirectory(rootDir, extensions, excludes, includes);
    };
    /**
      * Gets a value indicating whether the specified path exists and is a file.
      * @param path The path to test.
      */
    ParseConfigHost.prototype.fileExists = function (path) {
        return ts.sys.fileExists(path);
    };
    return ParseConfigHost;
}());

"use strict";
//@angular/webpack plugin main
require('reflect-metadata');
var core_1 = require('@angular/core');
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
        this.projectPath = options.project;
        this.rootModule = rootModule;
        this.rootModuleName = rootNgModule;
        var compilerHost = ts.createCompilerHost(tsConfig.compilerOptions, true);
        //create a program that references the main JIT entry point (eg the main AppModule), as we need that reference for codegen
        this.program = ts.createProgram(tsConfig.files, tsConfig.compilerOptions, compilerHost);
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
        var res = this._processNgModule("./" + this.rootModule, this.rootModuleName, this.projectPath);
        console.log('res', res);
        cb();
    };
    NgcWebpackPlugin.prototype._processNgModule = function (module, ngModuleName, containingFile) {
        var _this = this;
        var staticSymbol = this.reflectorHost.findDeclaration(module, ngModuleName, containingFile);
        var entryNgModuleMetadata = this.getNgModuleMetadata(staticSymbol);
        var loadChildren = this.extractLoadChildren(entryNgModuleMetadata);
        return loadChildren.reduce(function (res, lc) {
            var _a = lc.split('#'), childMoudle = _a[0], childNgModule = _a[1];
            //TODO calculate a different containingFile for relative paths
            var children = _this._processNgModule(childMoudle, childNgModule, containingFile);
            return res.concat(children);
        }, loadChildren);
    };
    NgcWebpackPlugin.prototype._convertToModule = function (s) {
        // TODO. Currently we assume that the string is the same as the import
        return s;
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
        var res = ts.parseJsonConfigFileContent(config, new ParseConfigHost(), "");
        return {
            compilerOptions: res.options,
            files: config.files,
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
    NgcWebpackPlugin.prototype.getNgModuleMetadata = function (staticSymbol) {
        var ngModules = this.reflector.annotations(staticSymbol).filter(function (s) { return s instanceof core_1.NgModule; });
        if (ngModules.length === 0) {
            throw new Error(staticSymbol.name + " is not an NgModule");
        }
        return ngModules[0];
    };
    NgcWebpackPlugin.prototype.extractLoadChildren = function (ngModuleDecorator) {
        var _this = this;
        var routes = ngModuleDecorator.imports.reduce(function (mem, m) {
            return mem.concat(_this.collectRoutes(m.providers));
        }, this.collectRoutes(ngModuleDecorator.providers));
        return this.collectLoadChildren(routes);
    };
    NgcWebpackPlugin.prototype.collectRoutes = function (providers) {
        var _this = this;
        if (!providers)
            return [];
        var ROUTES = this.reflectorHost.findDeclaration("@angular/router/src/router_config_loader", "ROUTES", undefined);
        return providers.reduce(function (m, p) {
            if (p.provide === ROUTES) {
                return m.concat(p.useValue);
            }
            else if (Array.isArray(p)) {
                return m.concat(_this.collectRoutes(p));
            }
            else {
                return m;
            }
        }, []);
    };
    NgcWebpackPlugin.prototype.collectLoadChildren = function (routes) {
        var _this = this;
        if (!routes)
            return [];
        return routes.reduce(function (m, r) {
            if (r.loadChildren) {
                return m.concat([r.loadChildren]);
            }
            else if (Array.isArray(r)) {
                return m.concat(_this.collectLoadChildren(r));
            }
            else if (r.children) {
                return m.concat(_this.collectLoadChildren(r.children));
            }
            else {
                return m;
            }
        }, []);
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

//@angular/webpack plugin main
import 'reflect-metadata';
import { ReflectiveInjector, OpaqueToken, NgModule } from '@angular/core'
import * as ts from 'typescript'
import * as ngCompiler from '@angular/compiler-cli'
import * as tscWrapped from '@angular/tsc-wrapped'
import * as path from 'path'
import * as fs from 'fs'
import { WebpackResourceLoader } from './resource_loader'
import { createCodeGenerator } from './codegen'
import { createCompilerHost } from './compiler'
import * as utils from './utils'
import * as _ from 'lodash'

function debug(...args) {
  console.log.apply(console, ['ngc:', ...args]);
}

/**
 * Option Constants
 */
export type NGC_COMPILER_MODE = 'aot' | 'jit'


export interface AngularWebpackPluginOptions {
  tsconfigPath?: string;
  compilerMode?: NGC_COMPILER_MODE;
  providers?: any[];
  entryModule: string;
}


const noTransformExtensions = ['.html', '.css']

export class NgcWebpackPlugin {
  projectPath: string;
  rootModule: string;
  rootModuleName: string;
  fileCache: any;
  codeGeneratorFactory: any;
  reflector: ngCompiler.StaticReflector;
  reflectorHost: ngCompiler.ReflectorHost;
  program: ts.Program;
  private injector: ReflectiveInjector;

  constructor(public options: any = {}) {
    const tsConfig = this._readConfig(options.project);
    const plugin = this;
    const ngcConfig = tsConfig.angularCompilerOptions;
    if (!ngcConfig) {
      throw new Error(`"angularCompilerOptions" is not set in your tsconfig file!`);
    }
    const [rootModule, rootNgModule] = ngcConfig.entryModule.split('#');

    this.projectPath = options.project;
    this.rootModule = rootModule;
    this.rootModuleName = rootNgModule;

    const compilerHost = ts.createCompilerHost(tsConfig.compilerOptions, true);
    //create a program that references the main JIT entry point (eg the main AppModule), as we need that reference for codegen
    this.program = ts.createProgram(tsConfig.files, tsConfig.compilerOptions, compilerHost);

    const basePath = process.cwd();

    //options for codegen
    const ngcOptions: ngCompiler.AngularCompilerOptions = {
      genDir: ngcConfig.genDir,
      rootDir: tsConfig.compilerOptions.rootDir,
      basePath: basePath,
      skipMetadataEmit: true,
      skipDefaultLibCheck: true,
      skipTemplateCodegen: false,
      trace: true,
      strictMetadataEmit: true
    }

    //TODO:i18n setup
    const i18nOptions = {
      i18nFile: undefined,
      i18nFormat: undefined,
      locale: undefined,
      basePath: basePath
    }

    this.reflectorHost = new ngCompiler.ReflectorHost(this.program, compilerHost, ngcOptions);
    this.reflector = new ngCompiler.StaticReflector(this.reflectorHost);
    this.codeGeneratorFactory = createCodeGenerator({ ngcOptions, i18nOptions, compilerHost, resourceLoader: undefined });
  }

  //registration hook for webpack plugin
  apply(compiler) {
    compiler.plugin('compile', (params) => this._compile(params))
    compiler.plugin('make', (compilation, cb) => this._make(compilation, cb))
    compiler.plugin('run', (compiler, cb) => this._run(compiler, cb));
    compiler.plugin('watch-run', (compiler, cb) => this._watch(compiler, cb));
    compiler.plugin('compilation', (compilation) => this._compilation(compilation));
  }

  private _make(compilation, cb) {
    const res = this._processNgModule("./" + this.rootModule, this.rootModuleName, this.projectPath);
    console.log('res', res);
    cb();
  }

  private _processNgModule(module: string, ngModuleName: string, containingFile: string): string[] {
    const staticSymbol = this.reflectorHost.findDeclaration(module, ngModuleName, containingFile);
    const entryNgModuleMetadata = this.getNgModuleMetadata(staticSymbol);
    const loadChildren = this.extractLoadChildren(entryNgModuleMetadata);

    return loadChildren.reduce((res, lc) => {
      const [childMoudle, childNgModule] = lc.split('#');
      //TODO calculate a different containingFile for relative paths
      const children = this._processNgModule(childMoudle, childNgModule, containingFile);
      return res.concat(children);
    }, loadChildren);
  }

  private _convertToModule(s: string): string {
    // TODO. Currently we assume that the string is the same as the import
    return s;
  }

  private _resolve(compiler, resolver, requestObject, cb) {
    cb()
  }


  private _run(compiler, cb) {
    cb()
  }

  private _watch(watcher, cb) {
    this._run(watcher.compiler, cb);
  }

  private _readConfig(tsConfigPath): any {
    let {config, error} = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    if (error) {
      throw error;
    }
    const res = ts.parseJsonConfigFileContent(config, new ParseConfigHost(), "");
    return {
      compilerOptions: res.options,
      files: config.files,
      angularCompilerOptions: config.angularCompilerOptions
    }
  }

  private _compile(params) {
    //console.log(params)
    // params.resolvers.normal.fileSystem = this.fileCache;
    // params.resolvers.context.fileSystem = this.fileCache;
    // params.resolvers.loader.fileSystem = this.fileCache;
  }

  private _compilation(compilation, ...args) {

  }

  private getNgModuleMetadata(staticSymbol: ngCompiler.StaticSymbol) {
    const ngModules = this.reflector.annotations(staticSymbol).filter(s => s instanceof NgModule);
    if (ngModules.length === 0) {
      throw new Error(`${staticSymbol.name} is not an NgModule`);
    }
    return ngModules[0];
  }

  private extractLoadChildren(ngModuleDecorator: any): any[] {
    const routes = ngModuleDecorator.imports.reduce((mem, m) => {
      return mem.concat(this.collectRoutes(m.providers));
    }, this.collectRoutes(ngModuleDecorator.providers));
    return this.collectLoadChildren(routes);
  }

  private collectRoutes(providers: any[]): any[] {
    if (!providers) return [];
    const ROUTES = this.reflectorHost.findDeclaration("@angular/router/src/router_config_loader", "ROUTES", undefined);
    return providers.reduce((m, p) => {
      if (p.provide === ROUTES) {
        return m.concat(p.useValue);

      } else if (Array.isArray(p)) {
        return m.concat(this.collectRoutes(p));

      } else {
        return m;
      }
    }, []);
  }

  private collectLoadChildren(routes: any[]): any[] {
    if (!routes) return [];
    return routes.reduce((m, r) => {
      if (r.loadChildren) {
        return m.concat([r.loadChildren]);

      } else if (Array.isArray(r)) {
        return m.concat(this.collectLoadChildren(r));

      } else if (r.children) {
        return m.concat(this.collectLoadChildren(r.children));

      } else {
        return m;
      }
    }, []);
  }
}

class ParseConfigHost implements ts.ParseConfigHost {
  useCaseSensitiveFileNames: boolean = true;

  readDirectory(rootDir: string, extensions: string[], excludes: string[], includes: string[]): string[] {
    return ts.sys.readDirectory(rootDir, extensions, excludes, includes);
  }
  /**
    * Gets a value indicating whether the specified path exists and is a file.
    * @param path The path to test.
    */
  fileExists(path: string): boolean {
    return ts.sys.fileExists(path);
  }
}
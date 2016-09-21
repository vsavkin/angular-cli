import 'reflect-metadata';
import * as ts from 'typescript';
import * as ngCompiler from '@angular/compiler-cli';
/**
 * Option Constants
 */
export declare type NGC_COMPILER_MODE = 'aot' | 'jit';
export interface AngularWebpackPluginOptions {
    tsconfigPath?: string;
    compilerMode?: NGC_COMPILER_MODE;
    providers?: any[];
    entryModule: string;
}
export declare class NgcWebpackPlugin {
    options: any;
    projectPath: string;
    rootModule: string;
    rootModuleName: string;
    fileCache: any;
    codeGeneratorFactory: any;
    reflector: ngCompiler.StaticReflector;
    reflectorHost: ngCompiler.ReflectorHost;
    program: ts.Program;
    private injector;
    constructor(options?: any);
    apply(compiler: any): void;
    private _make(compilation, cb);
    private _processNgModule(module, ngModuleName, containingFile);
    private _convertToModule(s);
    private _resolve(compiler, resolver, requestObject, cb);
    private _run(compiler, cb);
    private _watch(watcher, cb);
    private _readConfig(tsConfigPath);
    private _compile(params);
    private _compilation(compilation, ...args);
    private getNgModuleMetadata(staticSymbol);
    private extractLoadChildren(ngModuleDecorator);
    private collectRoutes(providers);
    private collectLoadChildren(routes);
}

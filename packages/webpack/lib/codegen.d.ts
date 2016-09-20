import { Observable } from 'rxjs/Rx';
import * as ts from 'typescript';
export interface CodeGenOptions {
    program: ts.Program;
    ngcOptions: any;
    i18nOptions: any;
    resourceLoader?: any;
    compilerHost: any;
}
export declare function createCodeGenerator({ngcOptions, i18nOptions, resourceLoader, compilerHost}: {
    ngcOptions: any;
    i18nOptions: any;
    resourceLoader: any;
    compilerHost: any;
}): (program: any) => Observable<{
    fileName: string;
    sourceText: string;
}>;

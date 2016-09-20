import { ResourceLoader } from '@angular/compiler';
export declare class WebpackResourceLoader implements ResourceLoader {
    private compiler;
    constructor(compiler: any);
    get(filePath: any): Promise<string>;
    transform(resource: string): string;
}

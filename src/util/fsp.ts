import { readdirSync } from "fs";
import { join } from "path";

// I mean we could include overloads but like, no?
export function walkdirSync(path: string): string[] {
    let result: string[] = [];
    const contents = readdirSync(path, { withFileTypes: true });
    contents.forEach((dirent) => {
        if (dirent.isFile()) result.push(join(path, dirent.name));
        if (dirent.isDirectory()) {
            result = result.concat(walkdirSync(join(path, dirent.name)));
        }
    });
    return result;
}
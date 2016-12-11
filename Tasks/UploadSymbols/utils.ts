import path = require("path");
import tl = require("vsts-task-lib/task");
import fs = require("fs");
import Q = require('q');

var Zip = require('jszip');

function getAllFiles(rootPath, recursive) {
    var files = [];

    var folders = [];
    folders.push(rootPath);

    while (folders.length > 0) {
        var folderPath = folders.shift();

        var children = fs.readdirSync(folderPath);
        for (var i = 0; i < children.length; i++) {
            var childPath = path.join(folderPath, children[i]);
            if (fs.statSync(childPath).isDirectory()) {
                if (recursive) {
                    folders.push(childPath);
                }
            } else {
                files.push(childPath);
            }
        }
    }

    return files;
}

export function createZipStream(rootPath : string, includeFolder: boolean) : NodeJS.ReadableStream {
    let zip = new Zip();
    let filePaths = getAllFiles(rootPath, /*recursive=*/ true);
    for (let i = 0; i < filePaths.length; i++) {
        let filePath = filePaths[i];
        let parentFolder = path.dirname(rootPath);
        let relativePath = includeFolder ? path.relative(parentFolder, filePath) : path.relative(rootPath, filePath);
        zip.file(relativePath, fs.createReadStream(filePath), { compression: 'DEFLATE' });
    }

    let currentFile = null;
    let zipStream = zip.generateNodeStream({
        base64: false,
        compression: 'DEFLATE',
        type: 'nodebuffer',
        streamFiles: true
    }, function(chunk) {
        if (chunk.currentFile != currentFile) {
            currentFile = chunk.currentFile;
            tl.debug(chunk.currentFile ? "Deflating file: " + chunk.currentFile + ", progress %" + chunk.percent : "done");
        }
    });

    return zipStream;
}

export function createZipFile(zipStream : NodeJS.ReadableStream, filename : string) : Q.Promise<string> {
    var defer = Q.defer<string>();

    zipStream.pipe(fs.createWriteStream(filename))
            .on('finish', function() {
                defer.resolve();
            })
            .on('error', function(err) {
                defer.reject(tl.loc("FailedToCreateFile", filename, err));
            });

    return defer.promise;
}

export function isDsym(s: string) {
    return (s && s.toLowerCase().endsWith(".dsym"));
}
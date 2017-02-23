/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ivan Lazarov. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
import tl = require('vsts-task-lib/task');
import fs = require('fs');
import path = require('path');
import Q = require('q');
import request = require('request');

let jszip = require('jszip');

async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        let requestOptions : request.CoreOptions = getRequestAuthOptions();
        let symbolsPath: string = tl.getInput('symbolsPath', true);
        let appId: string = tl.getInput('appId', true);

        tl.checkPath(symbolsPath, 'Symbols Path');

        let stats: tl.FsStats = tl.stats(symbolsPath);
        if (!stats.isDirectory()) {
            throw new Error(tl.loc('NoSymbolFilesFound', symbolsPath));
        }

        console.log(tl.loc('CompressingSymbols'));
        let archive = await prepareSymbols(symbolsPath);

        console.log(tl.loc('UploadingSymbols'));
        await uploadSymbols(archive, appId, requestOptions);

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullyUploaded'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

function getRequestAuthOptions() : request.CoreOptions {
    let authType: string = tl.getInput('authType', true);

    if (authType === 'ServiceEndpoint') {
        let serviceEndpoint: tl.EndpointAuthorization = tl.getEndpointAuthorization(tl.getInput('serviceEndpoint', true), false);
        if (serviceEndpoint.scheme === 'ms.vss-endpoint.endpoint-auth-scheme-basic') {
            tl.debug('-- Obtained username/password from service endpoint');
            return {
                auth: {
                    username: serviceEndpoint.parameters['username'],
                    password: serviceEndpoint.parameters['password']
                }
            };
        } else {
            tl.debug('-- Obtained external access token from service endpoint');
            return {
                qs: {
                    authToken: serviceEndpoint.parameters['apitoken']
                }
            };
        }
    } else if (authType === 'ExternalAccessToken') {
        tl.debug('-- Obtained external access token from task');
        return {
            qs: {
                authToken: tl.getInput('externalAccessToken', true)
            }
        };
    } else {
        tl.debug('-- Obtained username/password from task');
        return {
            auth: {
                username: tl.getInput('username', true),
                password: tl.getInput('password', true)
            }
        };
    }
}

function prepareSymbols(symbolsPath: string): Q.Promise<string> {
    tl.debug('-- Prepare symbols');
    let defer = Q.defer<string>();
    tl.debug(`---- Creating symbols from ${symbolsPath}`);
    let zipStream = createZipStream(symbolsPath, isDsym(symbolsPath));
    let workDir = tl.getVariable('System.DefaultWorkingDirectory');
    let zipName = path.join(workDir, `${path.basename(symbolsPath)}.zip`);
    createZipFile(zipStream, zipName).
        then(() => {
            tl.debug(`---- Symbol file: ${zipName}`);
            defer.resolve(zipName);
        });

    return defer.promise;
}

function uploadSymbols(filePath: string, appId : string, options : request.CoreOptions) : Q.Promise<void> {
    let raygunUrl : string = `https://app.raygun.com/dashboard/${appId}/settings/symbols`;
    tl.debug(`-- Uploading to Raygun url ${raygunUrl}`);
    options.followAllRedirects = true;
    options.strictSSL = false;
    options.formData = {
        DsymFile: fs.createReadStream(filePath)
    };

    let defer: Q.Deferred<void> = Q.defer<void>();
    request.post(raygunUrl, options, function(err, httpResponse, body) {
        if (err) {
            defer.reject(err);
        } else if (httpResponse.statusCode !== 200) {
            switch (httpResponse.statusCode) {
                case 401:
                    defer.reject(tl.loc('ServerErrorUnauthorized'));
                    break;
                case 404:
                    defer.reject(tl.loc('ServerErrorNotFound', appId));
                    break;
                default:
                    defer.reject(getFullErrorMessage(httpResponse, tl.loc('ServerErrorGeneric')));
                    break;
            }
        } else {
            defer.resolve();
        }
    });

    return defer.promise;
}

function getFullErrorMessage(httpResponse, message: string): string {
    let fullMessage = message +
        '\nstatusCode=' + httpResponse.statusCode +
        '\nstatusMessage=' + httpResponse.statusMessage;
    return fullMessage;
}

function getAllFiles(rootPath, recursive) {
    let files = [];

    let folders = [];
    folders.push(rootPath);

    while (folders.length > 0) {
        let folderPath = folders.shift();

        let children = fs.readdirSync(folderPath);
        for (let i = 0; i < children.length; i++) {
            let childPath = path.join(folderPath, children[i]);
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

function createZipStream(rootPath : string, includeFolder: boolean) : NodeJS.ReadableStream {
    let zip = new jszip();
    let filePaths = getAllFiles(rootPath, /*recursive=*/ true);
    for (let i = 0; i < filePaths.length; i++) {
        let filePath = filePaths[i];
        let parentFolder = path.dirname(rootPath);
        let relativePath = includeFolder ? path.relative(parentFolder, filePath) : path.relative(rootPath, filePath);
        zip.file(relativePath, fs.createReadStream(filePath), { compression: 'DEFLATE' });
    }

    let currentFile;
    let zipStream = zip.generateNodeStream(
        {
            base64: false,
            compression: 'DEFLATE',
            type: 'nodebuffer',
            streamFiles: true
        },
        function(chunk) {
            if (chunk.currentFile !== currentFile) {
                currentFile = chunk.currentFile;
                tl.debug(chunk.currentFile ? 'Deflating file: ' + chunk.currentFile + ', progress %' + chunk.percent : 'done');
        }
    });

    return zipStream;
}

function createZipFile(zipStream : NodeJS.ReadableStream, filename : string) : Q.Promise<string> {
    let defer = Q.defer<string>();

    zipStream.pipe(fs.createWriteStream(filename))
            .on('finish', function() {
                defer.resolve();
            })
            .on('error', function(err) {
                defer.reject(tl.loc('FailedToCreateFile', filename, err));
            });

    return defer.promise;
}

function isDsym(s: string) {
    return (s && s.toLowerCase().endsWith('.dsym'));
}

run();

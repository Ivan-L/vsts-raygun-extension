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
import utils = require('./utils.js');

async function run() {
    try
    {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        let symbolsPath: string = tl.getInput('symbolsPath', true);
        let appId: string = tl.getInput('appId', true);
        let externalAccessToken: string = tl.getInput('externalAccessToken', true);

        tl.checkPath(symbolsPath, "Symbols Path");

        let stats: tl.FsStats = tl.stats(symbolsPath);
        if (!stats.isDirectory())
            throw new Error(tl.loc('NoSymbolFilesFound', symbolsPath));

        var archive = await prepareSymbols(symbolsPath);
        await uploadSymbols(archive, appId, externalAccessToken);

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullyUploaded'));
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

function prepareSymbols(symbolsPath: string): Q.Promise<string> {
    tl.debug("-- Prepare symbols")
    let defer = Q.defer<string>();
    let stat = fs.statSync(symbolsPath);
    tl.debug(`---- Creating symbols from ${symbolsPath}`);
    let zipStream = utils.createZipStream(symbolsPath, utils.isDsym(symbolsPath));
    let workDir = tl.getVariable("System.DefaultWorkingDirectory");
    let zipName = path.join(workDir, `${path.basename(symbolsPath)}.zip`); 
    utils.createZipFile(zipStream, zipName).
        then(() => {
            tl.debug(`---- Symbol file: ${zipName}`)
            defer.resolve(zipName);
        });

    return defer.promise;
}

function uploadSymbols(filePath: string, appId : string, externalAccessToken: string) : Q.Promise<void> {
    let raygunUrl : string = `https://app.raygun.com/dashboard/${appId}/settings/symbols`;
    tl.debug(`-- Uploading to Raygun url ${raygunUrl}`);
    raygunUrl += `?authToken=${externalAccessToken}`;
    let options : request.CoreOptions = {
        followAllRedirects: true,
        strictSSL: false,
        formData: {
            DsymFile: fs.createReadStream(filePath)
        }
    };

    var defer: Q.Deferred<void> = Q.defer<void>();
    request.post(raygunUrl, options, function(err, httpResponse, body) {
        if (err) {
            defer.reject(err);
        }
        else if (httpResponse.statusCode != 200) {
            defer.reject(getFullErrorMessage(httpResponse, 'Uploading of symbols failed'));
        }
        else {
            defer.resolve(null);
        }
    });

    return defer.promise;
}

function getFullErrorMessage(httpResponse, message: string): string {
    var fullMessage = message +
        '\nstatusCode=' + httpResponse.statusCode +
        '\nstatusMessage=' + httpResponse.statusMessage;
    return fullMessage;
}

run();
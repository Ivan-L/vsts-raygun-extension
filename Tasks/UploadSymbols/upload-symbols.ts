/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ivan Lazarov. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
import tl = require('vsts-task-lib/task');
import fs = require('fs');
import os = require('os');
import path = require('path');
import Q = require('q');
import request = require('request');


async function run() {
    try
    {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        let symbolsPath: string = tl.getInput('symbolsPath', true);
        let appId: string = tl.getInput('appId', true);
        let externalAccessToken: string = tl.getInput('externalAccessToken', true);

        tl.checkPath(symbolsPath, "Symbols Path");

        await uploadSymbols(symbolsPath, appId, externalAccessToken);

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullyUploaded'));
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

function uploadSymbols(filePath: string, appId : string, externalAccessToken: string) : Q.Promise<void> {
    let raygunUrl = 'https://app.raygun.com/dashboard/${appId}/settings/symbols?authToken=${externalAccessToken}';
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
        '\nHttpResponse.statusCode=' + httpResponse.statusCode +
        '\nHttpResponse.statusMessage=' + httpResponse.statusMessage +
        '\nHttpResponse=\n' + JSON.stringify(httpResponse);
    return fullMessage;
}

run();
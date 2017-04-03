/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Gareth van der Berg. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
import tl = require('vsts-task-lib/task');
import path = require('path');
import Q = require('q');
import request = require('request');

async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        let requestOptions: request.CoreOptions = getRequestAuthOptions();
        let command = {
            apiKey: tl.getInput('apiKey', true),
            version: tl.getInput('version', true),
            ownerName: tl.getInput('ownerName', true),
            emailAddress: tl.getInput('emailAddress', true),
            scmIdentifier: tl.getInput('scmIdentifier', false),
            comment: tl.getInput('releaseNotes', false)
        };
        let options = Object.assign({ 'json': true, 'body': command }, requestOptions);

        await registerDeployment(options);

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullyRegistered'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

function getFullErrorMessage(httpResponse, message: string): string {
    let fullMessage = message + '\nstatusCode=' + httpResponse.statusCode + '\nstatusMessage=' + httpResponse.statusMessage;

    return fullMessage;
}

function getRequestAuthOptions(): request.CoreOptions {
    let authType: string = tl.getInput('authType', true);

    if (authType === 'ServiceEndpoint') {
        let serviceEndpoint: tl.EndpointAuthorization = tl.getEndpointAuthorization(tl.getInput('serviceEndpoint', true), false);

        tl.debug('-- Obtained external access token from service endpoint');

        return {
            qs: {
                authToken: serviceEndpoint.parameters['apitoken']
            }
        };
    } else {
        tl.debug('-- Obtained external access token from task');

        return {
            qs: {
                authToken: tl.getInput('externalAccessToken', true)
            }
        };
    }
}

function registerDeployment(options: request.CoreOptions): Q.Promise<void> {
    let raygunUrl: string = 'https://app.raygun.io/deployments';

    tl.debug(`-- Register deployment to Raygun url ${raygunUrl}`);

    let defer: Q.Deferred<void> = Q.defer<void>();

    request.post(raygunUrl, options, function (err, response, body) {
        if (err) {
            defer.reject(err);
        } else if (response.statusCode !== 200) {
            switch (response.statusCode) {
                case 401:
                    defer.reject(tl.loc('ServerErrorUnauthorized'));
                    break;
                case 404:
                    defer.reject(tl.loc('ServerErrorNotFound', options.body.apiKey));
                    break;
                default:
                    defer.reject(getFullErrorMessage(response, tl.loc('ServerErrorGeneric')));
                    break;
            }
        } else {
            defer.resolve();
        }
    });

    return defer.promise;
}

run();

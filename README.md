# Visual Studio Team Services Extension for Raygun

This extension contains a build task which allows for uploading of dSYM files for iOS applications to [Raygun](https://raygun.com/) from your CI environment.
dSYM files are used to symbolicate crash reports, which would otherwise only show memory addresses of objects and methods.

## Prerequisites

* An existing Ragun application for crash reporting needs to have been set up beforehand.

## Quick Start

Once you have created a Raygun application for crash reporting, add the Upload dSYMs task to automate the uploading of dSYM files from a VSTS build definition.

The task needs to be configured as follows:

1. **Symbols File Path** (String, Required) - Enter a relative path to the dSYM file for iOS.
2. **App ID** (String, Required) - To get this ID, either browse to Application settings > dSYM center and copy the last part of the URL path just before /symbols or just browse anywhere within Raygun and check the URL, your App ID will be in there, for example, `https://app.raygun.com/settings/xxxxxx/symbols`. The xxxxxx is your App ID.
3. **External Access Token** (String, Required) - Obtain an External Access Token. You can create this token within your user settings in Raygun, just navigate to (https://app.raygun.io/user) and check the External Access Token section. Generate a new token if one does not already exist.
# Visual Studio Team Services Extension for Raygun

This extension contains a build task which allows for uploading of dSYM files for iOS applications to [Raygun](https://raygun.com/) from your CI environment.
dSYM files are used to symbolicate crash reports, which would otherwise only show memory addresses of objects and methods.

## Prerequisites

* An existing Ragun application for crash reporting needs to have been set up beforehand.

## Quick Start

![Upload Symbols](/images/upload-symbols-task.png)

Once you have created a Raygun application for crash reporting, add the Upload Symbols to Raygun task to automate the uploading of dSYM files from a VSTS build definition.

The task needs to be configured as follows:

1. **Authentication Method** (Pick list, Required) - Choose how you would like to authenticate to Raygun. The following methods are supported:
    - **Service Endpoint** - Use a shared service that has already been set up or can be set up from this screen. The advantage of using a service is that there are no credentials to configure for a particular build - the credential are pre-configured at the service level and can be reused in multiple build definitions.
    - **External Access Token** - Obtain an External Access Token. You can create this token within your user settings in Raygun, just navigate to [https://app.raygun.io/user](https://app.raygun.io/user) and check the External Access Token section. Generate a new token if one does not already exist. Remember to use a secret variable for the token if going this route.
    - **Username and Password** - Use your Raygun username and password as is. Remeber to use a secret variable for password and/or username if going this route.

2. **App ID** (String, Required) - To get this ID, either browse to Application settings > dSYM center and copy the last part of the URL path just before /symbols or just browse anywhere within Raygun and check the URL, your App ID will be in there, for example, `https://app.raygun.com/settings/xxxxxx/symbols`. The xxxxxx is your App ID.

3. **Symbols File Path** (String, Required) - Enter a relative path to the dSYM file for iOS.

## Configuring Your Raygun credentials

![Service Connection](/images/service-connection.png)

Instead of configuring an External Access Token or Username and Password on every build task, you can configure your credentials globally and refer to them within each build definition as needed. To do this, perform the following steps:

1. Go into your Visual Studio Team Services or TFS project and click on the gear icon in the upper right corner

2. Click on the Services tab

3. Click on New Service Endpoint and select Raygun

4. Give the new endpoint a name and enter either an External Access Token or the Username and Password for the account which can be reused.

5. Select this endpoint via the name you chose in #4 whenever you add the Upload Symbols to Raygun task to a build definition

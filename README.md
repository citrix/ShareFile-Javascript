ShareFile-Javascript
====================

Intro
----
This repository contains several projects known as Solution Kits.  These kits allow you to easily connect ShareFile to your existing website.  Our first Solution Kit is a JavaScript FilePicker. This FilePicker is cross browser client-side utility to quickly access your ShareFile documents.

How to use the FilePicker
----
Very easy to use in two steps:
1.	Deploy the filepicker utility in user’s host server location
2.	Authorize request by including sharefile-auth javascript file in user’s page
Deploy FilePicker Library
Download filepicker source code from this repository
Deploy the code to the website with the redirect URI you have registered with your ShareFile oAuth token.

ShareFile Authorization
----
Download sharefile-auth.js file
User need to reference ShareFile authorization javascript file to validate its credentials.
<script type="text/javascript" src="[path]/sharefile-auth.js"></script>
After including the filepicker-auth.js file in code, the following function will be invoked by passing clientId and redirectUri in an object form:
    var params = {
        redirectUri: "[VALID_REDIRECT_URI]",
        clientId: "[ACCOUNT_CLIENT_ID]"
    };

    FilePicker.secureLogin(params);

    //If authorization url is other than default one then also set following            optional parameter before calling login method:
    params.authorizationUrl = authUri;
Set the proper attribute values and on calling above function, following login page/dialog will be displayed:
 
Input the credentials and click Login button to proceed.

Following is the diagram for user account authorization flow to retrieve access token:  

FilePicker Usage
----
After successful login the user will be navigated to FilePicker main page (specified in redirectUri parameter) and page will be displayed like following diagram:  

Following is diagram to show communication between FilePicker and ShareFile server:  

License
----
All code is licensed under the [MIT
License](https://github.com/citrix/ShareFile-Javascript/LICENSE.txt).

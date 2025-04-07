# Creating a Release
0. Announce your intention to create a release in the team chat.
1. Create a release branch from the `main` branch:
    ```
    git checkout -b releases/v1.35.0 main
    ```
2.  Push the new release branch:
    ```
    git push upstream releases/v1.35.0
    ```
3.  Create a Tag for the RC Creation: 
    ```
    git tag v1.35.0 
    git tag push
    ```
4. Bump the Extension version in the src/manifest.json and open a PR
5. Create the Prerelease: 
    ```
    gh release create v1.35.0 --prerelease --generate-notes
    ```
    __This will notify QA and give them the XPI.__ 
6. Request a Link from QA to the QA-Ticket i.e [Example Ticket](https://mozilla-hub.atlassian.net/browse/QA-3231)
7. Open a Review Ticket in ADDONSOPS, linking the QA Ticket. [Example ticket](https://mozilla-hub.atlassian.net/browse/ADDONSOPS-785)
8. After a Positive Review from QA go to [AMO Store](https://addons.mozilla.org/en-US/developers/addons) and upload the `amo_sources.zip` from [Github Release](https://github.com/mozilla-extensions/mozilla-vpn-extension/releases)

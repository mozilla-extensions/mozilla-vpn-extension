# Mozilla VPN Extension
>_A Firefox extension for the Mozilla VPN client_

## Requirements

- [Firefox Nightly](https://www.mozilla.org/firefox/channel/desktop/)
- [Mozilla VPN client](https://github.com/mozilla-mobile/mozilla-vpn-client)
- [Node.js v22.*](https://nodejs.org/)

___

## Development
1. Clone the source code


        git clone https://github.com/mozilla-extensions/mozilla-vpn-extension
        cd mozilla-vpn-extension

2. Initialize the submodules

        git submodule update --init --recursive


3. Install node modules

        npm install

4. Run

        npm run start

___

### Debugging build grief
```bash
# For more verbose output when extension is starting up
web-ext run -s src/ --verbose


# For identifying errors in the extension or other source code files.
cd src
web-ext lint
```
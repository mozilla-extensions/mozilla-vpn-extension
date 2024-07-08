# Vendoring for lit

[lit](https://lit.dev/) can be used to help create Web Components.

## The lit.all.mjs bundle

The lit package is imported in a vendoring step and the contents are extracted
into the lit.all.mjs file. This has some differences from using lit in a regular
npm project. Imports that would normally be into a specific file are pulled
directly from the lit.all.mjs file.

### Manually updating the bundle

To manually update, you'll need to checkout a copy of lit/lit, find the tag you
want and manually run our import commands.

  1. Clone https://github.com/lit/lit outside of moz-central
  2. Copy 3rdparty/lit/*.patch from this directory into the lit repo
  3. git apply *.patch
  4. npm install && npm run build
  5. Copy packages/lit/lit-all.min.js to src/vendor
  6. git commit "Update to lit@<version>"


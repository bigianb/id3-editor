## Viewer for American McGee's original Alice

Loads a views Alice BSP files in electron. Very early stage - if you know JS well then you can probably figure it out otherwise this is not for you at the moment.

# Quickstart

* Requires NodeJS 24
* Copy Alice pk3 files into a directory called alice-data at the repository root. You'll see this is in .gitignore so it will not appear in your git changed files. Alternatively use the fs_game command line to set the path to the pk3 files (`--fs_game="blah blah"`)
* run `npm install` to install all the dependencies
* run `npm run start` to start the viewer.

If you use VSCode then there are some run targets to help debugging. You can also bring up the developer tools in the main window (ctrl+shit+i or option-command-i on a mac) because the main window is just an embedded chrome browser.

## TODO

* Allow bsp selection
* Display entities in UI
* Read Shaders
* Display patches properly

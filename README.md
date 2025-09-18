## Viewer for American McGee's original Alice

Loads a views Alice BSP files in electron. Very early stage - if you know JS well then you can probably figure it out otherwise this is not for you at the moment.
Also seems to work for Heavy Metal FAKK2 but that's not really tested.

# Why?
It's a fun puzzle. The aim is to better understand and potentially document the file formats. For this type of work typescript is much quicker to prototype in than c++ and the runtime is fast enough.

# Quickstart

* Requires NodeJS 24
* Copy Alice pk3 files into a directory called alice-data at the repository root. You'll see this is in .gitignore so it will not appear in your git changed files. Alternatively use the fs_game command line to set the path to the pk3 files (`--fs_game="blah blah"`)
* run `npm install` to install all the dependencies
* run `npm run start` to start the viewer.

To specify the game path you would use:
```npm run start -- -- --fs_game=/foo/bar/path```
Note the two double dashes which are required to pass the command line parameter to the electron process.

You need to edit renderer.js in order to specify the map name to load (there is a TODO to allow this to be specified on the command line)

If you use VSCode then there are some run targets to help debugging. You can also bring up the developer tools in the main window (ctrl+shit+i or option-command-i on a mac) because the main window is just an embedded chrome browser.

## TODO

* Allow bsp selection via command line or UI
* Display entities in UI
* Read Shaders
* Display patches properly

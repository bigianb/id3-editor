## Viewer for American McGee's original Alice

Loads a views Alice BSP files in electron. Very early stage - if you know JS well then you can probably figure it out otherwise this is not for you at the moment.
Also seems to work for Heavy Metal FAKK2 but that's not really tested.

# Why?
It's a fun puzzle. The aim is to better understand and potentially document the file formats. For this type of work typescript is much quicker to prototype in than c++ and the runtime is fast enough.

# Quickstart

* Requires NodeJS 24
* run `npm install` to install all the dependencies
* run `npm run start` to start the viewer.

To specify the game path you would use:

```npm run start -- -- --fs_game=/foo/bar/path --game=alice --bsp=pandemonium```

Note the two double dashes which are required to pass the command line parameter to the electron process.

The `game` option can be one of: `rtcw`, `alice` or `fakk2`.

For RTCW on a mac you would use:
```npm run start -- -- --fs_game="/Users/ian/.wine/drive_c/GOG Games/Return to Castle Wolfenstein/Main" --game=rtcw --bsp=escape1```

The app will remember the options passed so the next time you can just use `npm run start`.

If you use VSCode then there are some run targets to help debugging. You can also bring up the developer tools in the main window (ctrl+shit+i or option-command-i on a mac) because the main window is just an embedded chrome browser.

## TODO

* Allow bsp selection via command line or UI
* Display entities in UI
* Read Shaders
* Display patches properly

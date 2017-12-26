const electron = require("electron");
const {app, BrowserWindow} = electron;
const SettingsUtil=require("./model/SettingsUtil");
const path=require("path");

var displays;

app.on("ready", () => {

    // Ascertain displays
    exports.displays=electron.screen.getAllDisplays();
    
    // Init
    exports.settings=new SettingsUtil(path.join(app.getPath('userData'),"settings.json"));
    initApp();

});

function initApp() {
    var prevwin=exports.win;
    // Create window
    var display=exports.displays[exports.settings.display<exports.displays.length?exports.settings.display:0];
    exports.win=new BrowserWindow({
        alwaysOnTop:true,
        backgroundColor: '#000',
        frame:false,
        fullscreen:true, 
        x:display.bounds.x, 
        y:display.bounds.y
    });
    exports.win.loadURL(`file://${__dirname}/views/index.html`);
    exports.win.webContents.on('dom-ready', function(){
        exports.win.setFullScreen(true);
    });
    // Close prev win
    if( prevwin ) {
        prevwin.close();
        prevwin=undefined;
    }
}

function quit() {
    app.quit();
}

exports.quit=quit;
exports.initApp=initApp;

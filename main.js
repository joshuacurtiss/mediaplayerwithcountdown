const electron = require("electron");
const {app, BrowserWindow} = electron;

app.on("ready", () => {
    var videoWin=new BrowserWindow({width:640, height:480, fullscreen:true, frame:false});
    videoWin.loadURL(`file://${__dirname}/index.html`);
    exports.win=videoWin;
});

exports.quit=()=>{
    app.quit();
}
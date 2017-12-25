const fs=require("fs-extra");

class SettingsUtil {

    constructor(path) {
        this.path=path;
        Object.assign(this,SettingsUtil.DEFAULTS);
        this.load();
        return this;
    }

    load() {
        try {
            if( this.path.length ) {
                var loadedSettings=fs.readJsonSync(this.path);
                Object.assign(this,loadedSettings);
            }
        } catch(e) {}
    }

    save() {
        try {
            if( this.path.length ) {
                var obj={};
                Object.keys(SettingsUtil.DEFAULTS).forEach(key=>obj[key]=this[key]);
                fs.writeJsonSync(this.path,obj);
            }
        } catch(e) {}
    }

}

SettingsUtil.DEFAULTS={
    "time": "13:00",
    "videoDirectory": "video",
    "doneVideo": "",
    "donePic": "done/done-sample.png",
    "phase2threshold": 600,
    "phase1threshold": 60,
    "imageDuration": 30
};

module.exports=SettingsUtil;
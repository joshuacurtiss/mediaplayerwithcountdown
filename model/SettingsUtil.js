const fs=require("fs-extra");

class SettingsUtil {

    constructor(path) {
        this.path=path;
        this.deepAssign(this,SettingsUtil.DEFAULTS);
        this.load();
        return this;
    }

    load() {
        try {
            if( this.path.length ) {
                var loadedSettings=fs.readJsonSync(this.path);
                this.deepAssign(this,loadedSettings);
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

    // Used to act like Object.assign() except with deep copies of arrays/objects
    deepAssign(orig,obj) {
        var v;
        for( var key in obj ) {
            v=obj[key];
            if( typeof v==="object" ) {
                orig[key]=Array.isArray(v)?[]:{};
                this.deepAssign(orig[key],v);
            } else {
                orig[key]=v;
            }
        }
    }

}

SettingsUtil.INSTANCEDEFAULTS={
    "startTime": "18:00",
    "endTime": "19:00",
    "videoDirectory": "",
    "doneMedia": "",
    "phase2threshold": 600,
    "phase1threshold": 60,
    "imageDuration": 30
};
SettingsUtil.DEFAULTS={
    "display": 0,
    "instances": []
}

module.exports=SettingsUtil;
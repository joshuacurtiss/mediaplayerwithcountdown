// Dependencies
let moment=require("moment");
require("moment-duration-format");
let fs=require("fs-extra");
let jQuery=$=require("./bower_components/jquery/dist/jquery.min.js");
require("./bower_components/jquery-ui/jquery-ui.min.js");

// Link to main process
const remote=require("electron").remote;
const main=remote.require("./main.js");

// Get Configs
const env=process.env.NODE_ENV || "prefs";
let config;
let configTries=0;
do {
    console.log(`Try ${configTries}`);
    try {
        config=require(`./config/${env}.json`);
    } catch(err) {
        try {
            fs.copySync(`${__dirname}/config/default.json`,`${__dirname}/config/${env}.json`);
        } catch(err) {
            alert("Had problems initializing the settings! "+err);
        }
    }
}
while ( typeof config=="undefined" && ++configTries<2 );

// Settings Form 
function displaySettings() {
    $("#settingsForm")
        .find("#frmVideoDirectory").val(config.videoDirectory).end()
        .find("#frmTime").val(config.time).end()
        .find("#frmPhase2threshold").val(config.phase2threshold).end()
        .find("#frmPhase1threshold").val(config.phase1threshold).end()
        .find("#frmDoneVideo").val(config.doneVideo).end()
        .find("#frmDonePic").val(config.donePic).end()
        .animate({"top":"20vh"},400);
}
function hideSettings() {
    $("#settingsForm").animate({"top":"120vh"},200);
}
function saveSettings() {
    hideSettings();
    config.time=$("#frmTime").val();
    config.videoDirectory=$("#frmVideoDirectory").val();
    config.phase2threshold=$("#frmPhase2threshold").val();
    config.phase1threshold=$("#frmPhase1threshold").val();
    config.doneVideo=$("#frmDoneVideo").val();
    config.donePic=$("#frmDonePic").val();
    fs.writeJson(`${__dirname}/config/${env}.json`,config,(err)=>{
        if(err) alert("Could not save settings. "+err);
    });
    initApp();
}
$("#btnCancel").click(hideSettings);
$("#btnSave").click(saveSettings);

// Globals 
var phase=9;
var timer;
var videos=[];
var goal;

// Functions
function setPhase(ph) {
    if(phase!=ph) {
        phase=ph;
        $("#debug").html("Phase "+ph);
        $("#timer, #video, #done").addClass("phase"+ph,750);
        if(phase==0 && $("#donevideo").is(":visible")) document.getElementById("donevideo").play();
    }
}
function getRandomInt(min, max) { // Returns a random number between min (inclusive) and max (exclusive)
    return Math.floor(Math.random() * (max - min)) + min;
}
function updateTimer() {
    var now=new moment();
    var diff=moment.duration(goal.diff(now));
    var secs=diff.asSeconds();
    $("#timer").html(diff.format("h:mm:ss"));
    if( secs > config.phase2threshold ) setPhase(3);
    else if( secs > config.phase1threshold ) setPhase(2);
    else if( secs > 0 ) setPhase(1);
    else setPhase(0);
    if( secs>0 ) timer=setTimeout(updateTimer,996);
}
function setVideo(f) {
    var path=`${config.videoDirectory}/${f}`;
    var $elem=$("#video");
    var success=($elem.attr("src")!=path || videos.length==1);
    if( success ) $elem.attr("src",path);
    return success;
}
function loadRandomVideo() {
    if( videos.length && ! setVideo(videos[getRandomInt(0,videos.length)]) ) loadRandomVideo();
}
function initApp() {
    // Some cleanup if restarting
    $("#timer, #video, #done").removeClass("phase3 phase2 phase1 phase0");
    if(timer) clearTimeout(timer);
    // Done materials
    if( config.doneVideo||"" != "" ) {
        $("#donevideo").show().attr("src",config.doneVideo);
        $("#donepic").hide();
    } else if( config.donePic||"" != "" ) {
        $("#donepic").show().attr("src",config.donePic);
        $("#donevideo").hide();
    }
    // Time
    var today=new moment();
    goal=new moment(today.format("MM/DD/YY")+" "+config.time);
    // Determine available playlist and setup the video element
    try {
        videos=fs.readdirSync(config.videoDirectory);
    } catch(e) {
        videos=[];
    }
    // Final run
    if( ! videos.length ) displaySettings();
    setPhase(3);
    loadRandomVideo();
    updateTimer();
}

$('#video').on('ended',loadRandomVideo);

// Quit/Settings Buttons
var btnpanelStatus=false;
var btnpanelTimeout;
$("#quit").click(()=>{main.quit()});
$("#settings").click(displaySettings);
$(window).keydown((e)=>{
    var key=e.key.toLowerCase();
    if( $(e.target).is("input") ) return true;
    else if( key=="q" || key=="x" || e.keyCode==27 ) main.quit();
    else if( key=="s" || key=="c" ) displaySettings();
    else return false;
})
$(window).mousemove(()=>{
    var currentStatus=btnpanelStatus;
    btnpanelStatus=true;
    if( ! currentStatus ) $("#btnpanel").animate({"opacity":0.8},400);
    if(btnpanelTimeout) clearTimeout(btnpanelTimeout);
    btnpanelTimeout=setTimeout(()=>{
        $("#btnpanel").animate({"opacity":0},400,()=>{btnpanelStatus=false});
    },2000);
})

// Start things up (pick a video, start timer)
initApp();

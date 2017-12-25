// Dependencies
const SettingsUtil=require("./model/SettingsUtil");
const moment=require("moment");
require("moment-duration-format");
const fs=require("fs-extra");
const path=require("path");
const jQuery=$=require("./bower_components/jquery/dist/jquery.min.js");
require("./bower_components/jquery-ui/jquery-ui.min.js");

// Link to main process
const remote=require("electron").remote;
const main=remote.require("./main.js");
const APPDATADIR=remote.app.getPath('userData')+path.sep;

// Get Configs
var config=new SettingsUtil(APPDATADIR+"settings.json");

// Settings Form 
function displaySettings() {
    $("#settingsForm")
        .find("#frmVideoDirectory").val(config.videoDirectory).end()
        .find("#frmImageDuration").val(config.imageDuration).end()
        .find("#frmTime").val(config.time).end()
        .find("#frmPhase2threshold").val(config.phase2threshold).end()
        .find("#frmPhase1threshold").val(config.phase1threshold).end()
        .find("#frmDoneMedia").val(config.doneMedia).end()
        .animate({"top":"20vh"},400);
}
function hideSettings() {
    $("#settingsForm").animate({"top":"120vh"},200);
}
function saveSettings() {
    hideSettings();
    config.time=$("#frmTime").val();
    config.videoDirectory=$("#frmVideoDirectory").val();
    config.imageDuration=$("#frmImageDuration").val();
    config.phase2threshold=$("#frmPhase2threshold").val();
    config.phase1threshold=$("#frmPhase1threshold").val();
    config.doneMedia=$("#frmDoneMedia").val();
    config.save();
    initApp();
}
function handleVideoDirectoryBrowse(){
    remote.dialog.showOpenDialog(main.win,{
        title: "Select Directory",
        buttonLabel: "Select",
        message: "Please choose a directory.",
        properties: ['openDirectory','createDirectory']
    }, function(dir){
        $("#frmVideoDirectory").val(dir?dir[0]:"");
    });
}
function handleDoneMediaBrowse(){
    remote.dialog.showOpenDialog(main.win,{
        title: "Select Done Media",
        buttonLabel: "Select",
        message: "Choose an image or video."
    }, function(dir){
        $("#frmDoneMedia").val(dir?dir[0]:"");
    });
}
$("#btnCancel").click(hideSettings);
$("#btnSave").click(saveSettings);
$("#frmVideoDirectoryBrowse").click(handleVideoDirectoryBrowse);
$("#frmDoneMediaBrowse").click(handleDoneMediaBrowse);

// Globals 
var phase=9;
var timer;
var videos=[];
var goal;
var imageTimeout;
const VIDEO_EXTS=[".m4v",".mov",".mp4",".webm",".avi"];
const IMAGE_EXTS=[".png",".jpg",".jpeg",".gif",".bmp"];
const FADE_DURATION=2;

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
function isImage(f) {
    var ext=path.extname(f).toLowerCase();
    return (IMAGE_EXTS.indexOf(ext)>=0);
}
function isVideo(f) {
    var ext=path.extname(f).toLowerCase();
    return (VIDEO_EXTS.indexOf(ext)>=0);
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
    if(imageTimeout) clearTimeout(imageTimeout);
    // Calculate path for media (regardless of image/video)
    var mediapath=`${config.videoDirectory}/${f}`;
    if( isImage(f) ) mediapath=`url("file://${mediapath}")`;
    // Get the previous path
    var $elem=$("#video");
    var prevPath=$elem.attr("src");
    if( !prevPath ) prevPath=$elem.css("background-image");
    // Determine if this was successful. If same as prev, that's not successful! Unless there's only one media item.
    var success=(prevPath!=mediapath || videos.length==1);
    // Set the media!
    if( success && (isImage(f) || isVideo(f)) ) {
        // Fade out
        $elem.addClass("fadeout",FADE_DURATION*1000,_=>{
            // Set the new media
            if( isImage(f) ) $elem.attr("src","").css("background-image",mediapath);
            else $elem.css("background-image","none").attr("src",mediapath)
            // Fade back in
            $elem.removeClass("fadeout",FADE_DURATION*1000,_=>{
                // For images, set the timeout period
                if( isImage(f) ) imageTimeout=setTimeout(loadRandomVideo,config.imageDuration*1000);
            });
        })
    } else {
        success=false;
    }
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
    if( isVideo(config.doneMedia) ) {
        $("#donevideo").show().attr("src",config.doneMedia);
        $("#donepic").hide();
    } else if( isImage(config.doneMedia) ) {
        $("#donepic").show().attr("src",config.doneMedia);
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

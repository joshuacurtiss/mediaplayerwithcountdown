// Dependencies
const SettingsUtil=require("../model/SettingsUtil");
const moment=require("moment");
require("moment-duration-format");
const fs=require("fs-extra");
const path=require("path");
const jQuery=$=require("../bower_components/jquery/dist/jquery.min.js");
require("../bower_components/jquery-ui/jquery-ui.min.js");

// Link to main process
const remote=require("electron").remote;
const main=remote.require("./main.js");
const APPDATADIR=remote.app.getPath('userData')+path.sep;

// Get Settings (all settings) and Configs (the settings that apply right now)
var settings=main.settings;
var config=settings.instances.find(instance=>{
    var now=moment();
    var day=now.format("MM/DD/YYYY ");
    var start=moment(day+instance.startTime);
    var end=moment(day+instance.endTime);
    return now.diff(start)>0 && now.diff(end)<0;
});

// Settings Form 

// Physically add a tab to the settings form
function addTab(data=SettingsUtil.INSTANCEDEFAULTS) {
    var $tabs=$("#tabs");
    var tid=$("#tabs .tab").last().attr("id");
    if( tid===undefined ) tid="0";
    tid=parseInt(tid.replace("tab","")) + 1;
    var li=$("<li/>").addClass("tabli").insertBefore("#list li:last");
    $("<a/>", {text: "New", id: "tablink"+tid, href: "#tab"+tid}).appendTo(li);
    var $newtab=$("#settingsTabTemplate").clone()
        .attr("id", "tab" + tid)
        .find(".frmVideoDirectoryBrowse").click(handleVideoDirectoryBrowse).end()
        .find(".frmDoneMediaBrowse").click(handleDoneMediaBrowse).end()
        .find(".frmStartTime").change(handleTimeChange).end()
        .find(".frmEndTime").change(handleTimeChange).end()
        .appendTo($tabs);
    $tabs.tabs("refresh");
    if(data) populateTab($newtab,data);
    setTimeout(function(){$tabs.tabs("option","active",-2)},1);
}
// Populate a settings tab with some settings
function populateTab($tab,data) {
    $tab
        .find(".frmVideoDirectory").val(data.videoDirectory).end()
        .find(".frmImageDuration").val(data.imageDuration).end()
        .find(".frmStartTime").val(data.startTime).end()
        .find(".frmEndTime").val(data.endTime).end()
        .find(".frmPhase2threshold").val(data.phase2threshold).end()
        .find(".frmPhase1threshold").val(data.phase1threshold).end()
        .find(".frmDoneMedia").val(data.doneMedia).end()
    if( data.startTime.length && data.endTime.length ) updateTabLink($tab);
}
// Change event handler for the settings time fields
function handleTimeChange(event) {
    updateTabLink($(event.target).closest(".tab"));
}
// Update link text to have the time range of it's settings time fields
function updateTabLink(tab) {
    const TFMT="h:mma";
    const FAKEDATE="01/01/01 ";
    var $tab=$(tab);
    var tid=$tab.attr("id").replace("tab","");
    var $tablink=$("#tablink"+tid);
    // TODO: These could be erroneous time values. Make this more resilient.
    var start=moment(FAKEDATE+$tab.find(".frmStartTime").val());
    var end=moment(FAKEDATE+$tab.find(".frmEndTime").val());
    var txt=start.format(TFMT)+"-"+end.format(TFMT);
    $tablink.text(txt);
}
function displaySettings() {
    var $tabs = $("#tabs").tabs();
    // Clear out tabs
    $tabs
        .find(".tabli").remove().end()
        .find(".tab").remove().end();
    // Rewrite tabse
    settings.instances.forEach(instance=>addTab(instance));
    if( settings.instances.length==0 ) addTab(); // If no instances, start a blank one
    // Write the displays pulldown, display settings form
    var dispHtml="";
    main.displays.forEach((disp,index)=>dispHtml+=`<option value="${index}">Display #${index+1}</option>`);
    $("#settingsForm")
        .find("#frmDisplay").html(dispHtml).val(settings.display).end()
        .animate({"top":"8vh"},400);
}
function hideSettings() {
    $("#settingsForm").animate({"top":"120vh"},200);
}
function saveSettings() {
    hideSettings();
    // Loop thru all instances and collect data
    var instances=[];
    $("#tabs .tab").each(function(){
        var instance={};
        instance.startTime=$(this).find(".frmStartTime").val();
        instance.endTime=$(this).find(".frmEndTime").val();
        instance.videoDirectory=$(this).find(".frmVideoDirectory").val();
        instance.imageDuration=$(this).find(".frmImageDuration").val();
        instance.phase2threshold=$(this).find(".frmPhase2threshold").val();
        instance.phase1threshold=$(this).find(".frmPhase1threshold").val();
        instance.doneMedia=$(this).find(".frmDoneMedia").val();
        instances.push(instance);
    });
    settings.instances=instances;
    settings.display=parseInt($("#frmDisplay").val());
    settings.save();
    main.initApp();
}
function handleVideoDirectoryBrowse(){
    remote.dialog.showOpenDialog(main.win,{
        title: "Select Directory",
        buttonLabel: "Select",
        message: "Please choose a directory.",
        properties: ['openDirectory','createDirectory']
    }, function(dir){
        // TODO: This is a bit hackish, I'm shortcutting it and setting value of current visible field
        if(dir) $(".frmVideoDirectory:visible").val(dir?dir[0]:"");
    });
}
function handleDoneMediaBrowse(){
    remote.dialog.showOpenDialog(main.win,{
        title: "Select Done Media",
        buttonLabel: "Select",
        message: "Choose an image or video."
    }, function(dir){
        // TODO: This is a bit hackish, I'm shortcutting it and setting value of current visible field
        if(dir) $(".frmDoneMedia:visible").val(dir?dir[0]:"");
    });
}
$("#btnCancel").click(hideSettings);
$("#btnSave").click(saveSettings);

// Globals 
var phase=9;
var timer;
var videos=[];
var goal;
var imageTimeout;
const VIDEO_EXTS=[".m4v",".mov",".mp4",".webm",".avi"];
const IMAGE_EXTS=[".png",".jpg",".jpeg",".gif",".bmp"];
const FADE_DURATION=2;

// Video Functions
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

// Initialization
function initApp() {
    // Some cleanup if restarting
    $("#timer, #video, #done").removeClass("phase3 phase2 phase1 phase0");
    if(timer) clearTimeout(timer);
    // If no active config is available, don't try to do stuff you can't do without configs
    if( config ) {
        // Done materials
        $("#donepic").hide();
        $("#donevideo").hide();
        if( isVideo(config.doneMedia) ) $("#donevideo").show().attr("src",config.doneMedia);
        else if( isImage(config.doneMedia) ) $("#donepic").show().attr("src",config.doneMedia);
        // End Time ("goal")
        var today=new moment();
        goal=new moment(today.format("MM/DD/YY")+" "+config.endTime);
    }
    // Determine available playlist and setup the video element
    try {
        videos=fs.readdirSync(config.videoDirectory);
    } catch(e) {
        videos=[];
    }
    // Final run. Show settings if no videos (or no configs), otherwise proceed!
    if( ! videos.length ) {
        displaySettings();
    } else {
        setPhase(3);
        loadRandomVideo();
        updateTimer();
    }
}

// Wire up events
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
$('#video').on('ended',loadRandomVideo);
$("#create_tab").click(function(){addTab()});

// Start things up (pick a video, start timer)
initApp();

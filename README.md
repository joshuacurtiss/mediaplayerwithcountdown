# Media Player with Countdown #

This app displays media in the designated directory until a target time. As
that time approaches, a countdown timer appears. As the time is imminent, the
countdown goes fullscreen.

A final video or image is displayed when the countdown time arrives.

This functionality is especially useful in sign language meetings to play videos of the songs before the meeting, and you can display an image announcing the start of the meeting when the time comes.

## How do I compile it myself? ##

The application runs on [Node.js](https://nodejs.org) and is compatible with Mac and Windows. to compile it, you will need Node.js installed.

After you download or clone the source, install all dependencies and run the build script.
It is named `build-installer-win` for Windows and `build-installer-mac` for Mac. For instance, to build for Windows:

```
npm install
npm run build-installer-win
```

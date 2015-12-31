var app = require('electron').app,
    BrowserWindow = require('electron').BrowserWindow,
    NativeImage = require('electron').nativeImage,
    updater = require('electron').autoUpdater,
    ipc = require('electron').ipcMain,
    os = require('os'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    request = require('request'),
    Q = require('q'),
    settings = require('./settings');
    menu = require('./menu.js'),
    appName = require('./package.json').name,
    version = require('./package.json').version;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null,
    splashWindow = null,
    quitting = false,
    isValid = false,
    src = null,
    platform = null,
    updateAvailable = false,
    updateReady = false,
    manualCheck = false;


settings.load(app.getAppPath(), app.getPath('userData'));

var handleStartupEvent = function() {
    var desktopShortcut, updatePath, dir, file;

    if (process.platform !== 'win32') {
        return false;
    }

    app.setAppUserModelId('com.squirrel.ZBoxNow.ZBoxNow');

    desktopShortcut = path.join(process.env.USERPROFILE, 'Desktop/ZboxNow.lnk');
    dir = path.join(process.env.USERPROFILE, '/AppData/Local/', appName, 'app-' + version);
    updatePath = path.join(dir, '../Update.exe');
    file = path.join(dir, appName + '.exe');

    //var logger = require('./logger')(module);

    function createShortcut() {
        var ws, spawn;
        try {
            ws = require("windows-shortcuts");
        } catch (err) {
            return;
        }

        ws.query(desktopShortcut, function(err, info) {
            if(err || info.target !== file) {
                spawn = require('child_process');
                spawn.exec(updatePath + ' --createShortcut ' + appName + '.exe');
            }
        });
    }

    function deleteShortcut() {
        try {
            fs.unlinkSync(desktopShortcut);
        } catch(err) {}
    }

    var squirrelCommand = process.argv[1];
    switch (squirrelCommand) {
        case '--squirrel-firstrun':
            createShortcut();
            break;
        case '--squirrel-install':
        case '--squirrel-updated':
            createShortcut();
            app.quit();

            return true;
        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Always quit when done
            app.quit();

            return true;
        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated
            app.quit();
            return true;
    }

    //if(!squirrelCommand) {
    //    createShortcut();
    //}
};

if (handleStartupEvent()) {
    return;
}

var verifyService = function(url) {
    var done = Q.defer();
    request({
        url: url,
        method: 'HEAD',
        strictSSL: false
    }, function(error, response) {
        if(error) {
            return done.reject();
        } else if (response.statusCode !== 200) {
            return done.reject();
        }

        return done.resolve();
    });
    return done.promise;
};

platform = process.platform + '-' + process.arch;
updater.setFeedURL(url.resolve(settings.get("services:oauth"), 'version/chatDesktop/' + version + '/' + platform));

app.checkVersion = function(manual) {
    manualCheck = manual;
    updater.checkForUpdates();
};

app.getService = function() {
    return settings.get("services:chat");
};

updater.on('error', function(err) {
    var msg = "Ocurrió un error al verificar si existen actualizaciones";
    console.log(msg);
    console.log(err);
    if(manualCheck) {
        if (splashWindow) {
            splashWindow.webContents.send('update-error', msg);
        } else if (mainWindow) {
            mainWindow.webContents.send('update-error', msg);
        }
    }
});

updater.on('checking-for-update', function() {
    console.log('checking-for-update');
});

updater.on('update-available', function() {
    console.log('update-available');
    if(splashWindow) {
        updateAvailable = true;
        isValid = true;
        splashWindow.close();
    }
});

updater.on('update-not-available', function() {
    console.log('update-not-available');
    if (mainWindow && manualCheck) {
        mainWindow.webContents.send('no-update');
    } else if(splashWindow) {
        isValid = true;
        splashWindow.webContents.send('ready');
        setTimeout(function() {
            splashWindow.close();
        }, 1000);
    }
});

updater.on('update-downloaded', function() {
    console.log('update-downloaded');
    if(splashWindow) {
        splashWindow.webContents.send('update-ready');
    } else if (mainWindow) {
        mainWindow.webContents.send('update-ready');
    }
    updateReady = true;
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    var splashOpts = settings.get("splash");
    splashWindow = new BrowserWindow({width: splashOpts.width, height: splashOpts.height, frame: false, 'skip-taskbar': true, transparent: true});
    mainWindow = new BrowserWindow(settings.get("window"));

    splashWindow.loadURL('file://' + __dirname + '/browser/views/splash.html');

    src = app.getService() || 'file://' + __dirname + '/browser/views/nosrc.html';

    splashWindow.on('close', function() {
        if(isValid) {
            mainWindow.show();
        }
    });

    splashWindow.on('closed', function() {
        splashWindow = null;
        if(mainWindow && updateAvailable && updateReady) {
            mainWindow.webContents.send('update-ready');
        }
    });

    mainWindow.loadURL('file://' + __dirname + '/browser/views/index.html' + '?src=' + encodeURIComponent(src));

    mainWindow.on('close', function (e) {
        settings.set('window:fullscreen', mainWindow.isFullScreen());
        if (!mainWindow.isFullScreen()) {
            var bounds = mainWindow.getBounds();
            settings.set('window:x', bounds.x);
            settings.set('window:y', bounds.y);
            settings.set('window:width', bounds.width);
            settings.set('window:height', bounds.height);
        }
        settings.save();

        if (process.platform != 'darwin') {
            return;
        }
        if (quitting) {
            return;
        }

        e.preventDefault();
        mainWindow.hide();
    });

    mainWindow.webContents.on('will-navigate', function (e) {
        e.preventDefault();
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    menu.load();
});

app.on('activate', function(e, hasVisibleWindows) {
    if (hasVisibleWindows) {
        mainWindow.focus();
    } else {
        if (mainWindow === null) {
            mainWindow = new BrowserWindow(settings.get("window"));
        }
        mainWindow.show();
    }
});

app.on('before-quit', function(e) {
    quitting = true;
});

ipc.on('check-services', function(event) {
    Q.all([ verifyService(url.resolve(settings.get("services:oauth"), 'status')), verifyService(app.getService()) ])
        .then(function() {
            return event.sender.send('service-status', true);
        })
    .fail(function() {
            return event.sender.send('service-status', false);
        });
});

ipc.on('install', function() {
    updateAvailable = false;
    updateReady = false;
    updater.quitAndInstall();
    app.quit();
});

ipc.on('exit', function() {
    app.quit();
});

ipc.on('version', function() {
    app.checkVersion(false);
});
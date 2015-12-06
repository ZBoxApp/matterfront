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
    appName = require('./package.json').name,
    version = require('./package.json').version;

// Report crashes to our server.
require('crash-reporter').start();

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
    manualCheck = false,
    config = {},
    configPaths = [
        path.join('.', 'config.json'),
        path.join(app.getPath('userData'), 'config.json'),
        path.join(app.getAppPath(), 'config.json')
    ],
    i = configPaths.length,
    appIcon = NativeImage.createFromPath(path.join(__dirname, '../resources/mattermost.ico'));


for (; --i >= 0;) {
    try {
        config = JSON.parse(fs.readFileSync(configPaths[i]));
        break;
    } catch(e) {
        if (e instanceof Error && e.code === 'ENOENT') {
            // next
        } else { throw e; }
    }
}

var handleStartupEvent = function() {
    var desktopShortcut, updatePath, dir, file;

    if (process.platform !== 'win32') {
        return false;
    }

    app.setAppUserModelId('com.squirrel.ZBoxChat.ZBoxChat');

    desktopShortcut = path.join(process.env.USERPROFILE, 'Desktop/ZboxChat.lnk');
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
updater.setFeedURL(url.resolve(config.services.oauth, 'version/chatDesktop/' + version + '/' + platform));

app.checkVersion = function(manual) {
    manualCheck = manual;
    updater.checkForUpdates();
};

updater.on('error', function(err) {
    var msg = "Ocurrió un error al verificar si existen actualizaciones";
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
    if(splashWindow) {
        updateAvailable = true;
        isValid = true;
        splashWindow.close();
    }
});

updater.on('update-not-available', function() {
    if (mainWindow && manualCheck) {
        mainWindow.webContents.send('no-update');
    } else if(splashWindow) {
        isValid = true;
        splashWindow.close();
    }
});

updater.on('update-downloaded', function() {
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
    splashWindow = new BrowserWindow({width:config.splash.width, height: config.splash.height, icon: appIcon, frame: false, 'skip-taskbar': true, transparent: true});
    mainWindow = new BrowserWindow({width: config.window.width, height: config.window.height, icon: appIcon, frame: true, show: false});

    splashWindow.loadURL('file://' + __dirname + '/splash.html');

    src = config.services.chat || 'file://' + __dirname + '/nosrc.html';

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

    mainWindow.loadURL('file://' + __dirname + '/index.html' + '?src=' + encodeURIComponent(src));

    mainWindow.on('close', function (e) {
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

    require('./menu');

});

app.on('activate', function(e, hasVisibleWindows) {
    if (hasVisibleWindows) {
        mainWindow.focus();
    } else {
        if (mainWindow === null) {
            mainWindow = new BrowserWindow({width: config.window.width, height: config.window.height});
        } else {
            mainWindow.show();
        }
    }
});

app.on('before-quit', function(e) {
    quitting = true;
});

ipc.on('check-services', function(event) {
    Q.all([ verifyService(url.resolve(config.services.oauth, 'status')), verifyService(config.services.chat) ])
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
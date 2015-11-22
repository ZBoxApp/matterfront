(function() {
    "use strict";

    var remote = require('electron').remote;
    var shell = require('electron').shell;
    var ipc = require('electron').ipcRenderer;
    var app = remote.app;
    var NativeImage = remote.nativeImage;
    var mainWindow = remote.getCurrentWindow();

    document.addEventListener('DOMContentLoaded', function () {
        var qs = window.location.search,
            src = decodeURIComponent(qs.replace('?', '').split('&')[0].split('=')[1]),
            webview = document.querySelector('#mattermost-remote'),
            overlay = document.querySelector('#overlay'),
            loading = document.querySelector('#loading'),
            unreadCount = 0,
            mentionCount = 0,
            bounceId = null,
            pendingUpdate = null;

        webview.setAttribute('src', src);

        webview.addEventListener('ipc-message', function (event) {
            switch (event.channel) {
                case 'unread-count':
                    unreadCount = parseInt(event.args[0], 10);
                    break;
                case 'mention-count':
                    mentionCount = parseInt(event.args[0], 10);
                    break;
                case 'credentials':
                    console.log('set credentials');
                    console.log(event.args[0]);
                    localStorage.setItem('credentials', JSON.stringify(event.args[0]));
                    break;
            }

            console.log('ipc-message');
            console.log(event.channel);
            // if we send too many badgeUpdates, the app instantiated from the remote seems to use a
            // LIFO queue so we end up overwriting the most recent one update with an older one
            // so instead we'll wait 500ms and then if the timeout is not cancelled we'll update for real
            if (pendingUpdate) {
                clearTimeout(pendingUpdate);
            }

            pendingUpdate = setTimeout(badgeUpdate, 500);
        });

        ipc.on('update-ready', function() {
            if(confirm('Hay una nueva versión de ZBox Chat\n ¿Quieres instalarla ahora?')) {
                ipc.send('install');
            }
        });

        ipc.on('no-update', function() {
            alert("Actualmente tienes la última versión del software");
        });

        webview.addEventListener('console-message', function (event) {
            console.log('Mattermost: ', event.message);
            if(event.message === "notification") {
                mainWindow.show();
            }
        });

        webview.addEventListener('new-window', function(e) {
            shell.openExternal(e.url);
        });

        webview.addEventListener('did-start-loading', function(event) {
            startLoading();
        });

        webview.addEventListener('did-stop-loading', function(event) {
            endLoading();
        });

        webview.addEventListener('dom-ready', function() {
            if (navigator.onLine) {
                overlay.style.opacity = 0;
                overlay.style['z-index'] = -1;
            }

            if(webview.getUrl().indexOf('oauth.zboxapp.com') > -1) {
                var credentials = localStorage.credentials ? JSON.parse(localStorage.getItem('credentials')) : null || { username: '', password: ''};
                webview.executeJavaScript("jQuery('#username').val('"+ credentials.username +"'); jQuery('#password').val('"+ credentials.password +"');");
            }
        });

        // Keep the focus on the webview.
        // Without this, the webview loses focus when switching to another app and back.
        window.addEventListener('focus', function (e) {
            webview.focus();
        });

        window.addEventListener('online', function() { handleOnline(false); } );
        window.addEventListener('offline', function() { handleOnline(false); } );

        setInterval(function() {
            app.checkVersion(false);
        }, (8 * 60 * 60 * 1000));

        var badgeUpdate = function () {
            var newBadge = false;
            if (unreadCount > 0) {
                newBadge = '●';
            } else if (unreadCount === 0) {
                newBadge = '';
            }

            if (mentionCount > 0) {
                newBadge = mentionCount;
                notifyOS(true);
            } else if (mentionCount === 0) {
                notifyOS(false);
            }

            if (newBadge !== false) {
                setBadge(newBadge);
            }

            pendingUpdate = null;
        };

        var notifyOS = function (flag) {
            if (process.platform === 'darwin') {
                if (bounceId) app.dock.cancelBounce(bounceId);
                if (flag) {
                    bounceId = app.dock.bounce('critical');
                }
            } else if (process.platform === 'win32') {
                mainWindow.flashFrame(flag);
            }
        };

        var setBadge = function (text) {
            text = text.toString();
            if (process.platform === 'darwin') {
                app.dock.setBadge(text);
            } else if (process.platform === 'win32') {
                if (text === '') {
                    mainWindow.setOverlayIcon(null, '');
                    return;
                }

                // Create badge
                var canvas = document.createElement('canvas');
                canvas.height = 140;
                canvas.width = 140;
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.ellipse(70, 70, 70, 70, 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.textAlign = 'center';
                ctx.fillStyle = 'white';

                if (text.length > 2) {
                    ctx.font = 'bold 65px "Segoe UI", sans-serif';
                    ctx.fillText('' + text, 70, 95);
                } else if (text.length > 1) {
                    ctx.font = 'bold 85px "Segoe UI", sans-serif';
                    ctx.fillText('' + text, 70, 100);
                } else {
                    ctx.font = 'bold 100px "Segoe UI", sans-serif';
                    ctx.fillText('' + text, 70, 105);
                }

                var badgeDataURL = canvas.toDataURL();
                var img = NativeImage.createFromDataUrl(badgeDataURL);

                mainWindow.setOverlayIcon(img, text);
            }
        };

        var handleOnline = function(first) {
            if (navigator.onLine) {
                // TODO: add spinner/connecting icon
                if (first) {
                    console.log('connecting');
                } else {
                    console.log('reconnecting');
                    setTimeout(function() { webview.reload(); }, 500);
                }
            } else {
                // TODO: add offline/unplugged icon
                console.log('disconnected');
                overlay.style.opacity = 0.5;
                overlay.style['z-index'] = 100;
                webview.blur();
            }
        };

        var startLoading = function() {
            loading.style.opacity = 0.5;
            loading.style['z-index'] = 100;
        };

        var endLoading = function() {
            loading.style.opacity = 0;
            loading.style['z-index'] = -1;
        };

        handleOnline(true);
    });
})();
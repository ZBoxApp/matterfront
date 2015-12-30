var ipc = require('electron').ipcRenderer,
    shell = require('electron').shell;

$(document).ready(function() {
    var progress = $('.progress-bar'),
        msgs = $('.info'),
        retryInterval = null;

    var handleOnline = function() {
        var isOnline = navigator.onLine;
        msgs.css('color', '#fff');
        msgs.text('verificando conexión...');
        progress.css('width', '10%');
        if(retryInterval) {
            clearInterval(retryInterval);
        }

        if(isOnline) {
            online();
        } else {
            offline(30);
        }
    };

    var online = function() {
        msgs.css('color', '#fff');
        progress.css('width', '25%');
        setTimeout(function () {
            progress.css('width', '45%');
            msgs.text('verificando servicios...');
            ipc.send('check-services');
        }, 1000);
    };

    var offline = function(timeout) {
        msgs.css('color', '#d14');
        retryInterval = setInterval(function() {
            if(timeout >= 0) {
                msgs.text('Fuera de linea! reintentando por ' + timeout.toString() + ' segundos');
            } else if (timeout === -1) {
                msgs.text('Cerrando aplicación...');
            }  else {
                clearInterval(retryInterval);
                ipc.send('exit');
            }
            timeout--;
        }, 1000);
    };

    var exitWithError = function(error, timeout) {
        timeout = timeout || 3000;
        msgs.css('color', '#d14');
        msgs.text(error + ' (Cerrando aplicación)');
        setTimeout(function() {
            ipc.send('exit');
        }, timeout);
    };

    ipc.on('service-status', function(status) {
        if(status) {
            msgs.css('color', '#fff');
            progress.css('width', '50%');
            msgs.text('Verificando versión...');
            progress.css('width', '75%');
            ipc.send('version');
        } else {
            exitWithError('Los servicios no están disponibles, intente más tarde.');
        }
    });

    ipc.on('update-error', function(msg) {
        alert(msg);
    });

    ipc.on('update-ready', function() {
        if(confirm('Hay una nueva versión de ZBox Chat\n ¿Quieres instalarla ahora?')) {
            ipc.send('install');
        }
    });

    ipc.on('ready', function() {
        progress.css('width', '100%');
        setTimeout(function() {
            msgs.text('Listo!');
        }, 500);
    });

    window.addEventListener('online', handleOnline );
    window.addEventListener('offline', handleOnline );

    setTimeout(handleOnline, 500);
});
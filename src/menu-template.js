/**
 * Created by enahum on 12/7/15.
 */
var app = require('electron').app,
    shell = require('electron').shell,
    name = app.getName();

var clearCredentials = function() {
    var webview = document.querySelector('#mattermost-remote');
    localStorage.removeItem('credentials');
    if(webview.getUrl().indexOf('oauth.zboxapp.com') > -1) {
        webview.executeJavaScript("jQuery('#username').val(''); \ " +
            "jQuery('#password').val('');");
    }
};

var template = [
    {
        label: 'Editar',
        submenu: [
            {
                label: 'Deshacer',
                accelerator: 'CmdOrCtrl+Z',
                role: 'undo'
            },
            {
                label: 'Rehacer',
                accelerator: 'Shift+CmdOrCtrl+Z',
                role: 'redo'
            },
            {
                type: 'separator'
            },
            {
                label: 'Cortar',
                accelerator: 'CmdOrCtrl+X',
                role: 'cut'
            },
            {
                label: 'Copiar',
                accelerator: 'CmdOrCtrl+C',
                role: 'copy'
            },
            {
                label: 'Pegar',
                accelerator: 'CmdOrCtrl+V',
                role: 'paste'
            },
            {
                label: 'Seleccionar Todo',
                accelerator: 'CmdOrCtrl+A',
                role: 'selectall'
            }
        ]
    },
    {
        label: 'Ver',
        submenu: [
            {
                label: 'Recargar',
                accelerator: 'CmdOrCtrl+R',
                click: function(item, focusedWindow) {
                    if (focusedWindow)
                        focusedWindow.reload();
                }
            },
            {
                label: 'Limpiar cache y recargar',
                accelerator: 'CmdOrCtrl+Shift+R',
                click: function(item, focusedWindow) {
                    if (focusedWindow)
                        focusedWindow.reload(true);
                        focusedWindow.webContents.reloadIgnoringCache();
                }
            },
            {
                label: 'Pantalla Completa',
                accelerator: (function() {
                    if (process.platform == 'darwin')
                        return 'Ctrl+Command+F';
                    else
                        return 'F11';
                })(),
                click: function(item, focusedWindow) {
                    if (focusedWindow)
                        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                }
            },
            {
                label: 'Toggle Developer Tools',
                accelerator: (function() {
                    if (process.platform == 'darwin')
                        return 'Alt+Command+I';
                    else
                        return 'Ctrl+Shift+I';
                })(),
                click: function(item, focusedWindow) {
                    if (focusedWindow)
                        focusedWindow.toggleDevTools();
                }
            }
        ]
    },
    {
        label: 'Ventana',
        role: 'window',
        submenu: [
            {
                label: 'Minimizar',
                accelerator: 'CmdOrCtrl+M',
                role: 'minimize'
            },
            {
                label: 'Cerrar',
                accelerator: 'CmdOrCtrl+W',
                role: 'close'
            }
        ]
    },
    {
        label: 'Ayuda',
        role: 'help',
        submenu: [
            {
                label: 'Conocer más',
                click: function() { shell.openExternal('http://zboxapp.com'); }
            },
            {
                label: 'Verificar actualizaciones',
                click: function(item, focusedWindow) {
                    app.checkVersion(true);
                }
            }

        ]
    }
];

if (process.platform == 'darwin') {
    template.unshift({
        label: name,
        submenu: [
            {
                label: 'Acerca ' + name,
                role: 'about'
            },
            {
                type: 'separator'
            },
            {
                label: 'Limpiar credenciales',
                accelerator: 'Command+Shift+L',
                click: clearCredentials
            },
            {
                type: 'separator'
            },
            {
                label: 'Servicios',
                role: 'services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                label: 'Esconder ' + name,
                accelerator: 'Command+H',
                role: 'hide'
            },
            {
                label: 'Esconder Otros',
                accelerator: 'Command+Shift+H',
                role: 'hideothers'
            },
            {
                label: 'Mostrar Todos',
                role: 'unhide'
            },
            {
                type: 'separator'
            },
            {
                label: 'Salir',
                accelerator: 'Command+Q',
                click: function() { app.quit(); }
            }
        ]
    });
    // Window menu.
    template[3].submenu.push(
        {
            type: 'separator'
        },
        {
            label: 'Traer todos hacia adelante',
            role: 'front'
        }
    );
} else {
    template.unshift({
        label: 'Archivo',
        submenu: [
            {
                label: 'Limpiar credenciales',
                accelerator: 'Ctrl+Shift+L',
                click: clearCredentials
            },
            {
                type: 'separator'
            },
            {
                label: 'Salir',
                accelerator: 'Alt+Q',
                click: function() { app.quit(); }
            }
        ]
    });
}

module.exports = template;

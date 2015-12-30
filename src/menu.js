var Menu = require('electron').Menu;

var menuTemplate = require("./menu-template.js");

var menu = {};

menu.load = function(){
    var appMenu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(appMenu);
};

module.exports = menu;
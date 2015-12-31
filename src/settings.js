/**
 * Created by enahum on 12/30/15.
 */
var os = require('os'),
    fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp').sync,
    nconf = require('nconf'),
    appStatePath, configPath,
    defaults = {
        services: {
            chat: "https://chat.zboxapp.com/",
            oauth: "https://oauth.zboxapp.com/"
        },
        window: {
            width: 1024,
            height: 600,
            show: false,
            frame: true
        },
        splash: {
            width:500,
            height: 250
        }
    };

var settings = {};

var getConfigHomePath = function() {
    if (nconf.get("dev-mode")) {
        console.log('loading dev mode config');
        return path.join(__dirname, 'config.json');
    }
    return path.join(os.homedir(), '.zboxnow', 'config.json');
};

var getConfigPath = function(userDataPath){
    return path.join(userDataPath, 'config.json');
};

var getAppStatePath = function(appPath){
    return path.join(appPath, 'state.json');
};

var fileExists = function(filename) {
    try {
        fs.accessSync(filename, fs.F_OK);
        return true;
    } catch (e) {
        return false;
    }
};

settings.load = function(appPath, userDataPath){
    nconf.argv();

    appStatePath = getAppStatePath(appPath);
    configPath = getConfigHomePath();
    if (!fileExists(configPath)) {
        configPath = getConfigPath(userDataPath);
    }

    nconf.file('state', appStatePath);
    nconf.file('config', configPath);
    nconf.defaults(defaults);
    console.log(configPath);
    console.log(appStatePath);
};

settings.get = function(key){
    return nconf.get(key);
};

settings.set = function(key, value){
    nconf.set(key, value);
};

settings.append = function(key, value){
    var array = nconf.get(key) || [];
    array.push(value);
    nconf.set(key, array);
    return settings._current;
};

settings.save = function() {
    configPath = getConfigHomePath();
    mkdirp(path.dirname(configPath));


    var config = {
        services: nconf.get("services"),
        window: nconf.get("window")
    };
    var content = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, content);
};

module.exports = settings;
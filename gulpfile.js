/**
 * Created by enahum on 11/10/15.
 */
var gulp = require('gulp'),
    packager = require('electron-packager'),
    packageJson = require('./package.json'),
    jshint = require('gulp-jshint'),
    del = require('del'),
    ignore = require('gulp-ignore');

process.NODE_ENV = 'production';

function makePackage(platform, arch) {
    var packageJson = require('./package.json');
    packager({
        dir: './src',
        name: packageJson.name,
        platform: platform,
        arch: arch,
        version: packageJson.devDependencies["electron-prebuilt"].replace("^", ""),
        out: './release',
        cache: './cache',
        sign: 'bruna',
        prune: true,
        overwrite: true,
        "app-version": packageJson.version,
        "app-bundle-id": "com.zboxapp.chat",
        "build-version": packageJson.version,
        'version-string': {
            ProductName: packageJson.name,
            CompanyName: 'ZBox Spa',
            ProductVersion: packageJson.version,
            FileDescription: packageJson.name,
            OriginalFilename: packageJson.name + '.exe',
            LegalCopyright: 'Copyright (C) 2015. ZBox Spa. Todos los derechos reservados'
        },
        icon: 'resources/zbox'
    }, function(err, appPath) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('done');
        }
    });
}

gulp.task('lint', function() {
    return gulp.src('./src/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('clean', function(done) {
    del.sync([ 'src/plugins/**',
        'src/plugins/**/.*',
        '!src/plugins',
        '!src/plugins/bootstrap',
        '!src/plugins/bootstrap/dist',
        '!src/plugins/bootstrap/dist/css',
        '!src/plugins/bootstrap/dist/js',
        '!src/plugins/bootstrap/dist/fonts',
        '!src/plugins/bootstrap/dist/fonts/*.*',
        '!src/plugins/jquery',
        '!src/plugins/**/*.min.*']);

    return done();
});

gulp.task('package', ['sync-meta'], function() {
    makePackage('all', 'all');
});

gulp.task('package:windows', ['sync-meta'], function() {
    makePackage('win32', 'all');
});

gulp.task('package:windows:x64', ['sync-meta'], function() {
    makePackage('win32', 'x64');
});

gulp.task('package:windows:ia32', ['sync-meta'], function() {
    makePackage('win32', 'ia32');
});

gulp.task('package:osx', ['sync-meta'], function() {
    makePackage('darwin', 'all');
});

gulp.task('package:linux', ['sync-meta'], function() {
    makePackage('linux', 'all');
});

gulp.task('sync-meta', function() {
    var appPackageJson = require('./src/package.json');
    var packageJson = require('./package.json');
    appPackageJson.name = packageJson.name;
    appPackageJson.version = packageJson.version;
    appPackageJson.description = packageJson.description;
    appPackageJson.author = packageJson.author;
    appPackageJson.license = packageJson.license;
    var fs = require('fs');
    fs.writeFileSync('./src/package.json', JSON.stringify(appPackageJson, null, '  ') + '\n');
});

gulp.task('default', ['lint', 'clean', 'package']);
/**
 * Created by enahum on 12/25/15.
 */
(function() {
    "use strict";
    var remote = require('electron').remote;
    var app = remote.app;
    var zboxnowUrl = app.getService();
    var mainWindow = remote.getCurrentWindow();

    document.title = app.getName() + ' ' + app.getVersion();

    function isEmail(email) {
        var regex = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|dev|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
        return regex.test(email);
    }

    function loadcss(uri){
        var fileref=document.createElement("link");
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", uri);
        if (typeof fileref!="undefined") {
            document.getElementsByTagName("head")[0].appendChild(fileref);
        }
    }

    function teamHandler(e) {
        e.preventDefault();
        var src = zboxnowUrl + e.target.getAttribute('data-team') + '/';
        mainWindow.loadURL('file://' + app.getAppPath() + '/browser/views/index.html?src=' + encodeURIComponent(src));
    }

    //loadcss(zboxnowUrl + 'static/css/bootstrap-3.3.5.min.css');
    //loadcss(zboxnowUrl + 'static/css/jasny-bootstrap.min.css');
    //loadcss(zboxnowUrl + 'static/css/bootstrap-colorpicker.min.css');
    //loadcss(zboxnowUrl + 'static/css/styles.css');
    //loadcss(zboxnowUrl + 'static/css/google-fonts.css');

    document.addEventListener('DOMContentLoaded', function() {
        var enviar = document.querySelector('[type="submit"]');
        var find_teams = document.querySelector('#find-team');
        var teams_found = document.querySelector('#teams-found');
        var found = document.querySelector('#found');
        var none = document.querySelector('#none');
        var emailSelector = document.querySelector('[type="text"]');
        var retry = document.querySelector('#retry');
        var new_team = document.querySelector('#new_team');

        retry.addEventListener('click', function retry(e){
            e.preventDefault();
            find_teams.style.display = "block";
            teams_found.style.display = "none";
            emailSelector.value = '';
            enviar.removeAttribute('disabled');
        });

        new_team.addEventListener('click', function(e) {
            e.preventDefault();
            var src = zboxnowUrl + 'signup_team';
            mainWindow.loadURL('file://' + app.getAppPath() + '/browser/views/index.html?src=' + encodeURIComponent(src));
        });

        $(document).on('click', '.teamName', teamHandler);

        enviar.addEventListener('click', function submit(e) {
            e.preventDefault();
            this.setAttribute('disabled', true);

            var email = emailSelector.value.trim().toLowerCase();
            var emailErrorClass = 'form-group';
            var label = document.querySelector('#emailError');

            if (!email || !isEmail(email)) {
                if (!label) {
                    label = document.createElement('label');
                    label.setAttribute('id', 'emailError');
                    label.className = 'control-label';
                    label.innerText = 'Por favor ingresa una dirección válida';
                    emailSelector.parentElement.insertBefore(label, emailSelector.nextSibling);
                }
                emailErrorClass = 'form-group has-error';
                this.removeAttribute('disabled');
            } else {
                if(label) {
                    emailSelector.parentElement.removeChild(label);
                }

                $.post(zboxnowUrl + 'api/v1/teams/find_teams', JSON.stringify({email: email}))
                    .done(function(data) {
                        if(label) {
                            emailSelector.parentElement.removeChild(label);
                        }
                        emailSelector.parentElement.className = 'form-group';
                        var keys = Object.keys(data);
                        find_teams.style.display = "none";
                        teams_found.style.display = "block";

                        if(keys.length) {
                            found.style.display = "block";
                            none.style.display = "none";
                            var p = $('p', found);
                            for(var key in data) {
                                if(data.hasOwnProperty(key)) {
                                    var $br = $('<br>');
                                    var $team = $('<a class="teamName" href="#" data-team="' + data[key].name + '">' + data[key].display_name +'</a>');
                                    p.append($br).append($team);
                                }
                            }

                        } else {
                            found.style.display = "none";
                            none.style.display = "block";
                        }
                    })
                    .fail(function(info) {
                        enviar.removeAttribute('disabled');
                        label = document.createElement('label');
                        label.setAttribute('id', 'emailError');
                        label.className = 'control-label';
                        label.innerText = 'Ocurrió un error al obtener los equipos a los que perteneces';
                        emailSelector.parentElement.insertBefore(label, emailSelector.nextSibling);
                        emailSelector.parentElement.className = 'form-group has-error';
                    });
            }

            emailSelector.parentElement.className = emailErrorClass;

        });
    });

})();
(function() {
    "use strict";

    var ipc = require('electron').ipcRenderer;

    var mentionCount = 0;
    var unreadCount = 0;

    var notifyHost = function () {
        // send back the counts to the webview host
        ipc.sendToHost('mention-count', mentionCount);
        ipc.sendToHost('unread-count', unreadCount);
    };

    // we'll only notify if there's a change in the counts
    var checkActivity = function () {
        var notify = false;
        var localMentionCount = 0;
        // get the actual count of mentions from Mattermost
        var badges = Array.prototype.slice.call(document.querySelectorAll('.unread-title.has-badge .badge'), 0);
        badges.forEach(function (b) {
            localMentionCount += parseInt(b.innerText, 10);
        });

        console.log(localMentionCount);

        // set flag to notify if the mention count has changed
        if (localMentionCount != mentionCount) {
            mentionCount = localMentionCount;
            notify = true;
        }

        var localUnreadCount = document.querySelectorAll('.unread-title').length;
        // set flag to notify if the unread count has changed
        if (localUnreadCount != unreadCount) {
            unreadCount = localUnreadCount;
            notify = true;
        }

        if (notify) notifyHost();
    };

    var getCookie = function (cname) {
        var ca = document.cookie.split(';');
        return ca.reduce(function(p, c) { if(c.indexOf(cname) > -1) { return c.split('=')[1].trim() } }, null) || null;
    };

    var teamName = getCookie("MMTEAM");
    var pathname = window.location.pathname;

    switch (pathname) {
        case '/':
            if (teamName) {
                window.location.href = '/' + teamName;
            } else {
                ipc.sendToHost('no-team');
            }
            break;
        case '/find_team':
            ipc.sendToHost('no-team');
            break;
    }

    document.addEventListener("DOMContentLoaded", function () {
        // observe the DOM for mutations, specifically the .ps-container
        // which contains all the sidebar channels

        setTimeout(function() {
            var MutationObserver = window.MutationObserver;
            var list = document.querySelector('#sidebar-left');

            var observer = new MutationObserver(function (mutations) {
                if (mutations.length) {
                    checkActivity();
                }
            });

            if (list) {
                observer.observe(list, {
                    subtree: true,
                    attributes: true,
                    childList: true
                });
            }
            // initial one time notification
            checkActivity();
        }, 1000);

    });
})();
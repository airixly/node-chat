/**
 * newSocket.js
 * Copyright (c) 2013 Youngfriend Inc.
 * All rights reserved.
 */
var io = {};
(function () {
    io.onConnect = function (host, port) {
        io.host = host;
        io.port = port;
        io.url = host + ":" + port;
        handshake(io.url);
        return io;
    }
    function WS() {
        io.connection = new WebSocket("ws://" + io.url);
        io.send = function (message) {
            io.connection.send(message);
        }
        io.connection.onopen = function () {
            io.onOpen();
        }
        io.connection.onmessage = function (message) {
            io.onMessage(message.data);
        }
    }

    function FlashSocket() {
        var flashContent = document.createElement("div"), flashvars = {}, params = {allowScriptAccess: "always"}, attributes = {"id": "socket", "name": "socket"}, handler;
        flashContent.id = "flashContent";
        document.body.appendChild(flashContent);
        handler = function (e) {
            if (e.success) {
                setTimeout(function () {
                    if (typeof e.ref.PercentLoaded !== "undefined" && e.ref.PercentLoaded()) {
                        var loadCheck = setInterval(function () {
                            if (e.ref.PercentLoaded() === 100) {
                                io.connection = e.ref;
                                io.send = function (message) {
                                    io.connection.send(message);
                                };
                                io.connection.connect('127.0.0.1', '8843');
                                clearInterval(loadCheck);
                            }
                        }, 1500);
                    }
                }, 200);
            }
        }
        swfobject.embedSWF(getSwfUrl(), "flashContent", "1", "1", "9.0.0", "", flashvars, params, attributes, handler);
    }

    function XHRPolling() {
        io.send = function (data) {
            var xhrpolling = createXHR();
            xhrpolling.onreadystatechange = function () {
                var messageType = JSON.parse(data).type;
                if (xhrpolling.readyState == 4 && xhrpolling.responseText) {
                    io.onMessage(xhrpolling.responseText);
                    switch (messageType) {
                        case "join":
                            io.send(data.replace('"type":"join"', '"type":"status"'));
                            break;
                        case "status":
                            setTimeout(function () {
                                io.send(data);
                            }, 1000);

                    }
                }
            }
            xhrpolling.open("POST", "http://" + io.url, true);
            xhrpolling.setRequestHeader("Content-Type", "text/plain");
            xhrpolling.send(data ? data : null);
        }
        io.onOpen();
    }


    function handshake(url) {
        var handshakeXHR = createXHR(), type;
        handshakeXHR.onreadystatechange = function () {
            try {
                if (handshakeXHR.readyState == 4) {
                    if (handshakeXHR.status >= 200 && handshakeXHR.status < 300 || handshakeXHR.status == 304)
                        type = handshakeXHR.responseText;
                    switch (type) {
                        case "webSocket":
                            new WS();
                            break;
                        case "flashSocket":
                            new FlashSocket();
                            break;
                        default :
                            new XHRPolling();
                    }
                }
            } catch (e) {
                throw e.toString();
            }
        }
        handshakeXHR.open("GET", "http://" + url + "?type=" + socketSupport(), true);
        handshakeXHR.send(null);
    }

    function createXHR() {
        if (window.XMLHttpRequest) { // Chrome, Mozilla, Safari,
            return new XMLHttpRequest();
        } else if (window.ActiveXObject) { // IE
            try {
                return  new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                try {
                    return new ActiveXObject("Microsoft.XMLHTTP");
                }
                catch (e) {
                }
            }
        }
    }

    function socketSupport() {
//        window.WebSocket = window.WebSocket || window.MozWebSocket;
//        if (window.WebSocket) {
//            return "webSocket";
//        } else if (swfobject.hasFlashPlayerVersion("10.0.0")) {
//            return "flashSocket";
//        } else {
//            return "xhrPolling";
//        }
        return "xhrPolling";
    }

    function getSwfUrl() {
        var scripts = document.getElementsByTagName("script"), i, matches;
        for (i = 0; i < scripts.length; i++) {
            matches = scripts[i].src.match(/(.*)socket\.js$/);
            if (matches) {
                return matches[1] + "flash/mySocket.swf";
            }
        }
        return "mySocket.swf";
    }
})();
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
        var flashContent = document.createElement("div"), flashvars = {},
        params = {allowScriptAccess: "always"}, attributes = {"id": "socket", "name": "socket"}, handler;
        flashContent.id = "flashContent";
        document.body.appendChild(flashContent);
        handler = function (e) {
            if (e.success) {
                //detect if flash had finish loading
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
                var messageType = JSON.parse(data).type, reMessage, i;
                if (xhrpolling.readyState == 4 && xhrpolling.responseText.length > 0) {
                    reMessage = JSON.parse(xhrpolling.responseText);
                    if (Array.isArray(reMessage)) {
                        for (i = 0; i < reMessage.length; i++) {
                            io.onMessage(reMessage[i]);
                        }
                    } else {
                        io.onMessage(JSON.stringify(reMessage));
                    }
                    switch (messageType) {
                        case "join":
                            //after join the server,check other users' status
                            io.send(data.replace('"type":"join"', '"type":"status"'));
                            break;
                        case "status":
                            //detect other users' status every 10 seconds
                            setTimeout(function () {
                                io.send(data);
                            }, 10000);
                            break;
                        case "history":
                            //detect if current user received new message every 5 seconds
                            setTimeout(function () {
                                io.send(data);
                            }, 5000);
                            break;
                    }
                }
            }
            xhrpolling.open("POST", "http://" + io.url, true);
            xhrpolling.setRequestHeader("Content-Type", "text/plain");
            xhrpolling.send(data ? data : null);
        }
        io.onOpen();
    }

    //notify the server to create corresponding socket
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
                    return null;
                }
            }
        }
    }

    //indicate the socket type the browser support
    function socketSupport() {
        window.WebSocket = window.WebSocket || window.MozWebSocket;
        if (window.WebSocket) {
            return "webSocket";
        } else if (swfobject.hasFlashPlayerVersion("10.0.0")) {
            return "flashSocket";
        } else {
            return "xhrPolling";
        }
    }

    //get flash file's path
    function getSwfUrl() {
        var scripts = document.getElementsByTagName("script"), i, matches;
        for (i = 0; i < scripts.length; i++) {
            matches = scripts[i].src.match(/(.*)socket\.js$/);
            if (matches) {
                return matches[1] + "flash/chatSocket.swf";
            }
        }
        return "chatSocket.swf";
    }
})();
var WebSocketServer = require('websocket').server, http = require('http'), net = require('net'), url = require('url');

var clients = {}, allUsers = {}, allId = [], allMsg, currentMsg = {}, sendData, websocketFlag = false, flashFlag = false;

//调用V6服务读取所有用户列表,并在本地维护
(function getAllUser() {
    allUsers = {
        "id_1": {
            "name": "user1",
            "status": 0
        },
        "id_2": {
            "name": "user2",
            "status": 0
        },
        "id_3": {
            "name": "user3",
            "status": 0
        }
    };
    allMsg = {
        "id_1": {
            "msg": {
                "id_2": [],
                "id_3": []
            },
            "offMsg": {
                "id_2": ["id2_hi", "I'm id_2"],
                "id_3": ["id3_hello", "I'm id_3"]
            }
        },
        "id_2": {
            "msg": {
                "id_1": [],
                "id_3": []
            },
            "offMsg": {
                "id_1": ["id1_test", "this is id_1"],
                "id_3": ["id3_hello", "I'm id_3"]
            }
        }
    };
    allId = ["id_1", "id_2", "id_3"];
})();

//监听客户端,创建socket对象
var server = http.createServer(function (req, res) {
    var message;
    if (req.method === "POST") {
        message = "";
        req.on('data', function (chunk) {
            message += chunk.toString();
        });
        req.on('end', function () {
            xhrPolling(res, message)
        });
    } else {
        message = url.parse(req.url, true).query.type;
        switch (message) {
            case "webSocket":
                if (!websocketFlag) {
                    new WS();
                }
                break;
            case "flashSocket":
                if (!flashFlag) {
                    new FlashSocket();
                }
                break;
            case "xhrPolling":
                break;
            default :
                message = allId.shift();
        }
        res.writeHead(200, {"Content-Type": "text/plain;charset=utf-8", "Access-Control-Allow-Origin": "*"});   //long polling
        res.end(message);
    }

}).listen(8081, function () {
        console.log((new Date()) + " Server is listening on port 8081");
    });


function FlashSocket() {
    net.createServer(function (socket) {
        socket.setEncoding("utf8");
        socket.write("<?xml version=\"1.0\"?>");
        socket.write("<!DOCTYPE cross-domain-policy SYSTEM 'http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd'>\n");
        socket.write("<cross-domain-policy>\n");
        socket.write("<allow-access-from domain='*' to-ports='*'/>\n");
        socket.write("</cross-domain-policy>\n");
        socket.end();
    }).listen(843);

    net.createServer(function (socket) {
        sendData = function (response, message) {
            response.write(JSON.stringify(message) + "\0");
        }
        socket.setEncoding("utf8");
        socket.on("data", function (data) {
            data = data.replace("\0", "");
            handleData(socket, data);
        });

        socket.on("error", function (e) {
            console.log(e);
            socket.end();
        });

        socket.on("timeout", function () {
            console.log("flashSocket timeout");
            socket.end();
        });
        socket.on("close", function () {
            for (var currentId in clients) {
                if (clients[currentId] === socket) {
                    delete clients[currentId];
                    changeStatus(currentId);
                    console.log("flashSocket closed");
                    allId.push(currentId);
                }
            }
            socket.end();
        });
    }).listen(8843, function () {
            flashFlag = true;
            console.log((new Date()) + "Flash Server is listening on port 8843");
        });
}
function xhrPolling(res, args) {
    sendData = function (response, message) {
        response.writeHead(200, {"Content-Type": "text/plain;charset=utf-8", "Access-Control-Allow-Origin": "*"});   //long polling
        response.end(JSON.stringify(message));
    }
    handleData(res, args);
}

function WS() {
    var wsServer = new WebSocketServer({
        httpServer: server
    });

//开始监听连接请求
    wsServer.on('request', function (req) {

        var connection = req.accept(null, req.origin), info = {};
        console.log((new Date()) + "Websocket Connection accepted.");

//监听客户端消息
        connection.on('message', function (message) {
            if (message.type === 'utf8') {
                handleData(connection, message.utf8Data, info);
            }
        });

//连接关闭时的处理
        connection.on('close', function () {
            for (var currentId in clients) {
                if (clients[currentId] === connection) {
                    delete clients[currentId];
                    changeStatus(currentId);
                    allId.push(currentId);
                    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected');
                }
            }
        });

        sendData = function (con, message) {
            con.sendUTF(JSON.stringify(message));
        };
        websocketFlag = true;
    });
}
//消息记录增加接收到的新消息
function addMsg(originMsg, extraMsg) {
    var i, j, origin, extra;
    for (i in extraMsg) {
        origin = originMsg[i] ? originMsg[i] : {};
        extra = extraMsg[i];
        for (j in extra) {
            if (Array.isArray(origin[j])) {
                origin[j] = origin[j].concat(extra[j]);
            } else {
                origin[j] = extra[j];
            }
        }
        originMsg[i] = origin;
    }
}


//保存对应id的用户的消息记录
function saveMessage(id, existMsg, sendMsg) {
    addMsg(existMsg, sendMsg);
    allMsg[id] = existMsg;
}

//获取对应id的用户的消息记录
function getMessage(id, type, sendMsg) {
    var result = allMsg.hasOwnProperty(id) ? allMsg[id] : {"msg": {}, "offMsg": {}};
    if (type === "join") {
        init(id, result);
    } else if (type === "msg") {
        saveMessage(id, result, sendMsg)
    }
}

//初始化传入当前用户的消息记录
function init(id, serviceMsg) {
    var initMsg, count = 0, details = {}, numTemp, offMsg;
    currentMsg[id] = serviceMsg;
    offMsg = currentMsg[id].offMsg;
    for (var i in offMsg) {
        numTemp = offMsg[i].length;
        details[i] = numTemp;
        count += numTemp;
    }
    if (count === 0) {
        details = "";
    }
    initMsg = {"type": "join", "count": count, "details": details, "users": allUsers};
    sendData(clients[id], initMsg);
}

//通知其他在线用户改变当前用户的在线状态
function changeStatus(id) {
    var status = (allUsers[id].status) ? 0 : 1;
    allUsers[id].status = status;
    for (var i in clients) {
        if (i !== id) {
            sendData(clients[i], {"type": "status", "id": id, "status": status});
        }
    }
}

//处理客户端数据
function handleData(response, data) {
    var sendMsg = {msg: {}, offMsg: {}}, content, contents = [], message = JSON.parse(data), type = message.type, id = message.id, originId = message.sender;
    switch (type) {
        case "join":
            if (allUsers.hasOwnProperty(id)) {
                clients[id] = response;
                changeStatus(id);
                getMessage(id, type);
            }
            break;
        case "msg":
            sendMsg.msg[originId] = [];
            sendMsg.offMsg[originId] = [];
            content = message.content;                         //content不应为空
            console.log("message accept: " + content);
            if (clients.hasOwnProperty(id)) {
                sendData(clients[id], {"type": "msg", "id": originId, "content": content});
                sendMsg.msg[originId].push(content);
            } else {
                sendMsg.offMsg[originId].push(content);
            }
            getMessage(id, type, sendMsg);
            break;
        case "history":
            if (currentMsg[originId].offMsg) {
                contents = currentMsg[originId].offMsg[id];
                if (contents && contents.length > 0) {
                    console.log(contents);
                    sendData(response, {"type": "history", "id": id, "contents": contents});
                    sendMsg.msg[id] = contents;
                    sendMsg.offMsg[id] = [];
                    currentMsg[originId].offMsg[id] = [];
                    saveMessage(originId, currentMsg[originId], sendMsg);
                }
            }
            break;
        case "status":
            response.writeHead(200, {"Content-Type": "text/plain;charset=utf-8", "Access-Control-Allow-Origin": "*"});
            for (var i in clients) {
                if (i !== id) {
                    response.write(JSON.stringify({"type": "status", "id": i, "status": 1}));
                }
            }
            response.end();

    }
}


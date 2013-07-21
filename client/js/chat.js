$(function () {
    var socket = io.onConnect("127.0.0.1", "8081"), currentId, currentName, receivedMsg = {};
    socket.onOpen = function () {
        socket.send(JSON.stringify({"type": "join", "id": currentId}));
    }
    socket.onMessage = function (message) {
        var response = JSON.parse(message), type = response.type, respId = response.id;
        var userList, user, state;
        switch (type) {
            case "join":
                userList = response.users;
                for (user in userList) {
                    if (user !== currentId) {
                        state = userList[user].status ? "on" : "off"
                        createUserList(user, userList[user].name, state);
                    } else {
                        currentName = userList[user].name;
                    }
                }
                break;
            case "status":
                $("li.user-contact").each(function () {
                    if ($(this).attr("id") === respId) {
                        state = response.status ? "on" : "off"
                        $(this).find("span.dot").text(state);
                    }
                });
                break;
            case "msg":
                if ($("li.selected").attr("id") === respId) {
                    response.contents = [response.content];
                } else {
                    if ($.isArray(receivedMsg[respId])) {
                        receivedMsg[respId].push(response.content);
                    } else {
                        receivedMsg[respId] = [response.content];
                    }
                    break;
                }
            case "history":
                createBubble(respId, response.contents);
                break;
        }
    }
    $("textarea").keypress(function (e) {
        var textarea = $(this), content, receiver = $("li.selected").attr("id");
        if (e.which === 13) {
            if (receiver) {
                content = textarea.val();
                createBubble(currentId, [content]);
                socket.send(JSON.stringify({"type": "msg", "id": receiver, "content": content, "sender": currentId}));
                textarea.val('').focus();
                return false;
            } else {
                alert("Please select a user for communication");
            }
        }
    });

    function createUserList(id, name, state) {
        var template = $("<li class='user-contact'><div class='avatar'></div><div class='status'><span class='user-name'></span><div class='dot'></div><span class='dot'></span></div></li>");
        template.attr("id", id);
        template.find("span.user-name").text(name);
        template.find("span.dot").text(state);
        template.children("div.avatar").addClass(name);
        template.bind("click",function () {
            var sender = $(this), senderId = sender.attr("id");
            if (sender !== $("#user-list li.selected")) {
                $("#message-area li").remove();
                if (receivedMsg.hasOwnProperty(senderId)) {
                    createBubble(senderId, receivedMsg[senderId]);
                }
                $("#user-list li,div.dot").removeClass("selected");
                sender.addClass("selected");
                sender.find("div.dot").addClass("selected");
                socket.send(JSON.stringify({"type": "history", "id": senderId, "sender": currentId}));
            }
        }).appendTo("#user-list ul");
    }

    function createBubble(id, contents) {
        var content, template, type, i, name = $("li.user-contact[id=" + id + "]").find("span.user-name").text();
        name = (id === currentId) ? currentName : name;
        for (i = contents.length - 1; i > -1; i--) {
            content = contents[i];
            template = $("<li class='separate-line'></li><li class='bubble'><div class='avatar'></div><div class='message-content'><span></span></div></li>");
            type = (id === currentId) ? "right" : "left";
            template.addClass("chat-" + type);
            template.children(".avatar").addClass(name).css("float", type);
            template.find("span").text(content);
            if (content.length > 60) {
                template.children(".message-content").width(500);
            }
            $("#message-area").append(template);
        }
    }

    (function getId() {
//        var isFirefox = typeof InstallTrigger !== 'undefined';
//        var isChrome = !!window.chrome;
//        var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
//        return isFirefox ? "id_1" : (isChrome ? "id_2" : (isSafari ? "id_3" : "ms"));
        $.ajax({
            url: "http://127.0.0.1:8081",
            type: "get",
            data: {"type": "queryId"},
            async: false,
            success: function (data) {
                currentId = data ? data : "";
            }
        })
    })();
});

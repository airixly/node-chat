node-chat
=========

A simple chat demo built on [Node.js](http://nodejs.org/) which is based on websocket,flash and ajax long polling.


Installation
------------
 
1.Get this project with the following command:
	
	$ git clone https://github.com/airixly/node-chat.git


2.Install [websocket](https://github.com/Worlize/WebSocket-Node) in the project root:
	
	$ npm install websocket


3.Deploy the "client" directory to your web server's app directory,such as "tomcat/webapps/" if you are using tomcat.

Running the demo
----------------
1.Start the server from the project root directory:

	$ sudo node server/server.js  
	

2.Start the web server,for example,if you are using tomcat,you can run this command:
	
	$ sh tomcat/bin/catalina.sh run
	

3.Open `http://localhost:8080/node/chat.html` in your browser	if you haven't changed the default port "8080" before.

Note
----
For simplicity,this demo just supports three users in the same time.In other words,you can only open three pages in the browsers,and then chat with each other.

The server has used the system's "843" port for flash policy,so you should use "sudo" to start the server.


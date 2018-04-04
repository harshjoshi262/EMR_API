var ChatController = new require(APP_ROOT_PATH+'/controllers/ChatController');
var ChatControllerInstance = new ChatController();
ChatControllerInstance.socket_connection();


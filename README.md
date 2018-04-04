// command to run server

ON WINDOWS
```shell
$ set NODE_ENV='<instance_name>' && pm2 start ehr2.js --name='<instance_name>:<port>'
```
ON linux
```shell
$ export NODE_ENV='<instance_name>' && pm2 start ehr2.js --name='<instance_name>:<port>'
```
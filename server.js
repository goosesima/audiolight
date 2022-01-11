const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');

const config = require('./config.json');
const port = config.port || 55769;
const wsPort = config.wsPort || 9000;
const wsServer = new WebSocket.Server({ port: wsPort });
const acesssCode = Math.floor(Math.random() * 1000000000).toString();
const app = express();

var whiteList = [];

var kick = false;

wsServer.on('connection', function (wsClient){
    wsClient.send('hi');
    var client = {
        name: null,
        logged: false
    };
    wsClient.on('message', function (e) {
        const cmds = e.toString().split('/');
        const cmd = cmds[0];
        const arg1 = cmds[1];
        if (cmd == 'name'){
            client.name = arg1;
            wsClient.send('key');
        }
        if (cmd == 'key'){
            if (arg1 != acesssCode){
                console.log('wrongcode', acesssCode, arg1);
                wsClient.send('wrongcode');
            }else{
                client.logged = true;
                wsClient.send('pass');
            }
        }
        if(client.logged == false){
            return wsClient.send('pleaselogin');
        } 
        if (cmd == 'kick'){
            toggle(arg1 == '1');
        }
    });
});

function toggle(value){
    const ledsSys = '/sys/class/leds/';

    fs.readdir(ledsSys, (err, files) => {
        files.forEach(file => {
            const path = ledsSys + file + '/brightness';
            var j = '0';
            if(value){
                j = Math.random().toString().substring(0, 3).replace('.', '');
            }
            fs.writeFile(path, j, { encoding: 'utf8' }, function(){

            });
        });
    });

    // const usbBus = '/sys/bus/usb/devices/';
    // const onUSBPath = '/sys/bus/usb/drivers/usb/bind';
    // const offUSBPath = '/sys/bus/usb/drivers/usb/unbind'
    // fs.readdir(usbBus, (err, files) => {
        // files.forEach(file => {
            // var path = onUSBPath;
            // if(!value){
                // path = offUSBPath;
            // }
            // fs.writeFile(path, file, { encoding: 'utf8' }, function () {
// 
            // });
        // });
    // })
}
function getFile(filePath) {
    // If the path does not exist, return a 404.
    if (!fs.existsSync(filePath)) {
        return res.status(404).end();
    }

    // Check if the existing item is a directory or a file.
    if (fs.statSync(filePath).isDirectory()) {
        const filesInDir = fs.readdirSync(filePath);
        // If the item is a directory: show all the items inside that directory.
        return filesInDir;
    } else {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // If the item is a file: show the content of that file.
        return fileContent;
    }
}
app.get('/', (req, res) => {
    res.send(getFile('index.html'));
});
app.get('/audiolight.js', (req, res) => {
    res.type('js');
    res.send(getFile('audiolight.js'));
});
app.get('/audiolight.css', (req, res) => {
    res.send(getFile('audiolight.css'));
});

app.get('/wsport', (req, res) => {
    res.send(String(wsPort));
});

app.get('/network.js', (req, res) => {
    res.send(getFile('network.js'));
});

app.listen(port, () => {
console.log(`Control app at http://localhost:${port}?code=${acesssCode}`)
});
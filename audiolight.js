function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

var kick = true;
var myName = Math.floor(Math.random() * 1000000000000000000).toString();
if(typeof localStorage['audiolight-name'] !== 'undefined'){
    myName = localStorage['audiolight-name'];
}else{
    localStorage['audiolight-name'] = myName;
}
var code = 0;
try {
    code = new URL(location.href).searchParams.get('code');
} catch (error) {
    
}
var statusMsg = document.getElementById('statusMsg');
var codeConnection = document.getElementById('codeConnection');
codeConnection.value = code;
var socket;
var networkTrained = false;
var connected = false;
codeConnection.oninput = function () {
    code = codeConnection.value;
    if(socket) {
        socket.send('code/' + code);
    }
}

function connectToWS(){
    httpGetAsync(location.protocol + '//' + location.host + '/wsport', function (response) {
        connect(Number(response));
    });
}
function connect(port){
    const wsAddress = 'ws://' + location.hostname + ':' + port;
    socket = new WebSocket(wsAddress);

    socket.onopen = function (e) {
        statusMsg.innerText = '[WebSocket] Connecting...';
    };

    socket.onmessage = function (e) {
        // on data received
        if(e.data == 'key'){
            socket.send('key/' + code);
        }
        if(e.data == 'hi'){
            socket.send('name/' + myName);
        }
        if(e.data == 'pass'){
            connected = true;
        }
        statusMsg.innerText = 'Status: ' + e.data;
    };

    socket.onclose = function (e) {
        statusMsg.innerText = '[WebSocket] Closed!';
        connected = false;
        connectToWS();
    };

    socket.onerror = function (error) {
    };
}

connectToWS();

var powered = false;
var currentBpm = document.getElementById('current-bpm');
var powerBtn = document.getElementById('power');
var bpm = 0;
var beat = document.getElementById('beat');
var deviceName = document.getElementById('device-name');
var trainBtn = document.getElementById('trainBtn');

var trainEnabled = false;

// provide optional config object (or undefined). Defaults shown.
const config = {
    binaryThresh: 0.5,
    hiddenLayers: [3], // array of ints for the sizes of the hidden layers in the network
    activation: 'sigmoid', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
    leakyReluAlpha: 0.01, // supported for activation type 'leaky-relu'
};

// create a simple feed forward neural network with backpropagation
const net = new brain.NeuralNetwork(config);

if (typeof networkSave == 'object'){
    net.fromJSON(networkSave);
    networkTrained = true;
}

trainBtn.onclick = function () {
    trainEnabled = !trainEnabled;
    if(trainEnabled){
        trainBtn.innerText = 'TRAIN OFF [Working...]';
    }else{
        trainBtn.innerText = 'TRAIN ON';
    }
}
function setBpm() {
    currentBpm.innerText = 'BPM: ' + bpm;
    window.requestAnimationFrame(setBpm);
}

setBpm();

async function getMedia(constraints) {
    let stream = null;

    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
        /* using stream */
    } catch (err) {
        return deviceName.innerText = 'Error';
    }
}

function getBiggest(data) {
    var o = 0, big = 0, z = 0;
    for (var i = 0; i < data.length; i++) {
        if (data[i] > big) {
            data[i] = big;
            z = i;
        }
    }
    return [big, z];
}
beat.innerText = '---';
function makeBeat() {
    beat.innerText = 'Beat!';
    kick = true;
    if (connected) {
        socket.send('kick/1');
    }
    setTimeout(function () {
        beat.innerText = '---';
        kick = false;
        if (connected) {
            socket.send('kick/0');
        }
    }, 30);
}
var zKeyStatus = false;
var zkeystate = document.getElementById('zkeystate');
window.onkeydown = function (e) {
    if (e.code === 'KeyZ'){
        zKeyStatus = true;
        zkeystate.innerText = '[|||||]'
    }
}
window.onkeyup = function (e) {
    if (e.code === 'KeyZ') {
        zKeyStatus = true;
        zkeystate.innerText = '[-----]';
    }
}
var aivalue = document.getElementById('aivalue');
var sensitivity = document.getElementById('sensitivity');
powerBtn.onclick = function () {
    var audioContext = new AudioContext();
    if (!powered) {
        getMedia({ audio: true, video: false }).then(function (e) {
            if (e) {
                powered = true;
                const track = e.getAudioTracks()[0];
                deviceName.innerText = 'Device: ' + track.label;
                var audioDevice = audioContext.createMediaStreamSource(e);
                var analyser = audioContext.createAnalyser();
                audioDevice.connect(analyser);
                // analyser.connect(audioContext.destination);

                analyser.fftSize = 256;

                const bufferLength = analyser.frequencyBinCount;

                var cycles = 0;
                var bpm2 = 0;
                var biggest = 0;
                var iCycles = 1000;
                setInterval(function () {
                    var data = new Uint8Array(bufferLength);
                    analyser.getByteFrequencyData(data);
                    // data = data.slice(0, 64);
                    var input = [];
                    for (var j = 0; j < data.length; j++) {
                        input.push(data[j] / 255);
                    }
                    var output = [0];
                    if(zKeyStatus){
                        output = [1];
                    }
                    if(trainEnabled){
                        net.train([{ input: input, output: output }]);
                        networkTrained = true;
                    }
                    if (networkTrained){
                        const output = net.run(input)[0];
                        aivalue.innerText = 'Value: ' + (output * 100);
                        if (output > (sensitivity.value / 100)){
                            makeBeat();
                        }
                    }

                    // if (cycles == (iCycles + 1)) {
                    //     bpm2 = 0;
                    //     cycles = 0;
                    //     biggest = getBiggest(data);
                    // } else {
                    //     var i = biggest[1];
                    //     if (data[biggest[1]] > (biggest[0] * 0.9)) {
                    //         bpm = (bpm2 / cycles) * 100;
                    //         bpm = bpm2;
                    //         bpm2++;
                    //         makeBeat();
                    //     }
                    // }
                    // cycles++;
                }, 10);
                powerBtn.innerText = 'Listening...';
            }
        });
    }

    if (powered) {
    } else {
        powerBtn.innerText = 'Click to listen.'
    }
}
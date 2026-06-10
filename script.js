let device;
let server;
let bluetoothCharacteristic;
let isOperationInProgress = false;
let commandQueue = [];

document.getElementById('connect-button').addEventListener('click', async () => {
    const button = document.getElementById('connect-button');
    const statusMessage = document.getElementById('status-text');
    const statutIndicator = document.getElementById('status-indicator');
    const deviceName = document.getElementById('device-name').value;

    if (button.textContent === 'Connect') {
        statusMessage.textContent = 'Status: Connection on going';

        try {
            device = await navigator.bluetooth.requestDevice({
                filters: [{ name: deviceName }],
                optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
            });

            server = await device.gatt.connect();
            console.log('Connected to', device.name);
            statusMessage.textContent = `Status: Connected to ${device.name}`;
            statutIndicator.classList.remove('disconnected');
            statutIndicator.classList.add('connected');
            button.textContent = 'Disconnect';

            // Add event listener for disconnection
            device.addEventListener('gattserverdisconnected', onDisconnected);
        } catch (error) {
            statusMessage.textContent = 'Status: Connection failed';
            statutIndicator.classList.remove('disconnected');
            statutIndicator.classList.add('failed');
            console.error('Connection error:', error);
        }
    } else if (button.textContent === 'Disconnect') {
        disconnectDevice();
    }
});

function onDisconnected() {
    console.log('Device disconnected');
    const statusMessage = document.getElementById('status-text');
    const statutIndicator = document.getElementById('status-indicator');
    statusMessage.textContent = 'Status: Disconnected';
    statutIndicator.classList.remove('connected', 'failed');
    statutIndicator.classList.add('disconnected');
    document.getElementById('connect-button').textContent = 'Connect';
}

function disconnectDevice() {
    if (device && server) {
        server.disconnect();
        onDisconnected();
    }
}

const switches = document.querySelectorAll('.switch-label input[type="radio"]');
const bleRemote = document.getElementById('ble-remote');
const irRemote = document.getElementById('ir-remote');
const lineFollowing = document.getElementById('line-following');
const directionContainer = document.getElementById('direction-container');
const buttons = document.querySelectorAll('.direction-button');

directionContainer.classList.remove('show');
                buttons.forEach(btn => {
                btn.disabled = true;
                btn.style.cursor = "default";
                })


switches.forEach(switchElement => {
    switchElement.addEventListener('change', () => {
        if (switchElement.checked) {
            switches.forEach(otherSwitch => {
                if (otherSwitch !== switchElement) {
                    otherSwitch.checked = false;
                    
                }
            });


            if (bleRemote.checked) {
                enqueueCommand('Mode BLE');
                directionContainer.classList.add('show');
                buttons.forEach(btn => {
                    btn.disabled = false;
                    btn.style.cursor = "pointer";
                });

                
            } else if (irRemote.checked) {
                enqueueCommand('Mode IR');
                directionContainer.classList.remove('show');
                buttons.forEach(btn => {
                btn.disabled = true;
                btn.style.cursor = "default";
                });
                
            } else if (lineFollowing.checked) {
                enqueueCommand('Mode Line');
                directionContainer.classList.remove('show');
                buttons.forEach(btn => {
                    btn.disabled = true;
                    btn.style.cursor = "default";   
                });
            
            }
        }
    });
});

const directionButtons = document.querySelectorAll('.direction-button');

directionButtons.forEach(button => {

    button.addEventListener('mousedown', () => {
        const command = button.id.charAt(0).toUpperCase() + ' pressed';
        enqueueCommand(command);
        button.classList.add('active');
    });

    button.addEventListener('mouseup', () => {
        const command = button.id.charAt(0).toUpperCase() + ' released';
        enqueueCommand(command);
        button.classList.remove('active');
    });


    button.addEventListener('touchstart', (event) => {
        event.preventDefault();
        const command = button.id.charAt(0).toUpperCase() + ' pressed';
        enqueueCommand(command);
        button.classList.add('active');
    });

    button.addEventListener('touchend', () => {
        const command = button.id.charAt(0).toUpperCase() + ' released';
        enqueueCommand(command);
        button.classList.remove('active');
    });

    button.addEventListener('touchcancel', () => {
        button.classList.remove('active');
    });
});

directionButtons.forEach(button => {
    let interval;

    button.addEventListener('mousedown', () => {
        interval = setInterval(() => {
            const x = Math.random() * 100;
            const y = Math.random() * 100;

            button.style.backgroundPosition = `${x}% ${y}%`;
        }, 10); 
            button.style.transform = "scale(1.25)";
    });

    button.addEventListener('mouseup', () => {
        clearInterval(interval);
        button.style.transform = "scale(1)";
    });

    button.addEventListener('mouseleave', () => {
        clearInterval(interval);
    });

    button.addEventListener('touchstart', () => {
        interval = setInterval(() => {
            const x = Math.random() * 100;
            const y = Math.random() * 100;

            button.style.backgroundPosition = `${x}% ${y}%`;
        }, 10); 
            button.style.transform = "scale(1.25)";
    });

    button.addEventListener('touchend', () => {
        clearInterval(interval);
        button.style.transform = "scale(1)";
    });

    button.addEventListener('touchcancel', () => {
        clearInterval(interval);
    });
});

async function processCommandQueue() {
    if (isOperationInProgress || commandQueue.length === 0) {
        return;
    }

    isOperationInProgress = true;
    const commandString = commandQueue.shift();

    try {
        if (!device || !server || !device.gatt.connected) {
            showError('Device is not connected');
            return;
        }

        const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
        bluetoothCharacteristic = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');

        const encoder = new TextEncoder();
        const data = encoder.encode(commandString);

        await bluetoothCharacteristic.writeValue(data);
        console.log('Command sent:', commandString);
    } catch (error) {
        showError('Failed to send Bluetooth command:', error);
        console.error('Send command error:', error);
    } finally {
        isOperationInProgress = false;
        processCommandQueue();
    }
}

function enqueueCommand(commandString) {
    commandQueue.push(commandString);
    processCommandQueue();
}

function showError(message, error) {
    const alertBox = document.getElementById('error-alert');
    alertBox.textContent = `⚠️ ${message} ${error ? error.message : ''}`;
    alertBox.classList.remove('hidden');
    alertBox.classList.add('show');

    console.log('Error displayed:', alertBox.textContent);

    // Hide the error message after 4 seconds
    setTimeout(() => {
        alertBox.classList.remove('show');
        console.log('Removing show class');
        setTimeout(() => {
            alertBox.classList.add('hidden');
            console.log('Adding hidden class');
        }, 400); 
    }, 4000);
}

window.addEventListener('beforeunload', () => {
    if (device && server) {
        server.disconnect();
        const statusMessage = document.getElementById('status-text');
        statusMessage.classList.remove('connected', 'failed');
        statusMessage.classList.add('disconnected');
        console.log('Disconnected from', device.name);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    document.title = 'Mon STage de Seconde';
});
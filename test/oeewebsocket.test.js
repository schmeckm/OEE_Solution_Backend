describe('WebSocket Server', function() {
    let WebSocket;
    let Server;
    let wsServer;
    let client;

    before(async function() {
        WebSocket = await
        import ('ws');
        Server = await
        import ('http');
    });

    beforeEach(async function() {
        const server = Server.createServer();
        wsServer = new WebSocket.WebSocketServer({ server });

        wsServer.on('connection', (ws) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message);
                if (parsedMessage.type === 'updateRating') {
                    const { ProcessOrderID, ID, Reason } = parsedMessage.data;
                    // Mock data processing and sending back to client
                    ws.send(JSON.stringify({ type: 'Microstops', data: [{ ProcessOrderID, ID, Reason }] }));
                }
            });
        });

        server.listen(8000);
        client = new WebSocket.WebSocket('ws://localhost:8000');

        await new Promise((resolve) => {
            client.on('open', () => {
                resolve();
            });
        });
    });

    afterEach(async function() {
        if (client && client.readyState === WebSocket.WebSocket.OPEN) {
            client.close();
        }
        wsServer.close();
    });

    it('should connect to the WebSocket server and receive a response', async function() {
        const testMessage = JSON.stringify({
            type: 'updateRating',
            data: { ProcessOrderID: 1, ID: '123', Reason: 'Test Reason' }
        });

        await new Promise((resolve, reject) => {
            client.on('message', (message) => {
                const response = JSON.parse(message);
                try {
                    expect(response.type).to.equal('Microstops');
                    expect(response.data).to.be.an('array');
                    expect(response.data[0].Reason).to.equal('Test Reason');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            client.send(testMessage);
        });
    });

    it('should handle invalid JSON messages gracefully', async function() {
        await new Promise((resolve, reject) => {
            client.on('message', (message) => {
                try {
                    expect(message).to.equal('Invalid message format');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            client.send('Invalid JSON String');
        });
    });

    it('should close connection gracefully', async function() {
        await new Promise((resolve) => {
            client.on('close', () => {
                resolve();
            });

            client.close();
        });
    });
});
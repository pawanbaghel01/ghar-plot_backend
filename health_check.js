import http from 'http';

const options = {
    hostname: 'localhost',
    port: 8866,
    path: '/auth/test', // We know /auth exists, let's try a non-existent one to see if we get a 404 response quickly
    method: 'GET',
    timeout: 1000
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    process.exit(0);
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    process.exit(1);
});

req.on('timeout', () => {
    console.error('request timed out');
    req.destroy();
    process.exit(1);
});

req.end();

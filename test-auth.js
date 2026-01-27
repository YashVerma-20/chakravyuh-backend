// Quick test script to verify authentication endpoints
const https = require('https');
const http = require('http');

const baseURL = 'http://localhost:5000';

// Helper function to make POST requests
function makeRequest(endpoint, data) {
    return new Promise((resolve, reject) => {
        const dataString = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': dataString.length
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                console.log(`\n--- ${endpoint} ---`);
                console.log(`Status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(responseData);
                    console.log('Response:', JSON.stringify(parsed, null, 2));
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    console.log('Raw response:', responseData);
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Error for ${endpoint}:`, e.message);
            reject(e);
        });

        req.write(dataString);
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing CHAKRAVYUH Authentication Endpoints\n');
    console.log('='.repeat(60));

    // Test 1: Judge login with admin
    await makeRequest('/api/auth/judge/login', {
        username: 'admin',
        password: 'admin123'
    });

    // Test 2: Judge login with judge1
    await makeRequest('/api/auth/judge/login', {
        username: 'judge1',
        password: 'admin123'
    });

    // Test 3: Participant access with real team (Binary Brains)
    await makeRequest('/api/auth/participant/access', {
        accessToken: 'TEAM_BB001_2026'
    });

    // Test 4: Participant access with another real team (Three Idiots)
    await makeRequest('/api/auth/participant/access', {
        accessToken: 'TEAM_TI002_2026'
    });

    // Test 5: Participant access with dummy team
    await makeRequest('/api/auth/participant/access', {
        accessToken: 'DUMMY_TEST_001_2026'
    });

    // Test 6: Invalid access token (should fail)
    await makeRequest('/api/auth/participant/access', {
        accessToken: 'INVALID_TOKEN'
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All authentication tests completed!');
}

runTests().catch(console.error);

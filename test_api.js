const axios = require('axios');
const { spawn } = require('child_process');

console.log('Starting Wallpaper API server for testing...');
const server = spawn('node', ['index.js'], { cwd: __dirname });

server.stdout.on('data', (data) => {
  const text = data.toString();
  if (text.includes('Wallpaper Gallery running')) {
    runTests();
  }
});

server.stderr.on('data', (data) => {
  console.error('[Server stderr]:', data.toString());
});

let testStarted = false;
async function runTests() {
  if (testStarted) return;
  testStarted = true;

  try {
    console.log('\n--- Testing GET / (Static Frontend HTML) ---');
    const rootRes = await axios.get('http://127.0.0.1:3000/');
    console.log('GET / status:', rootRes.status);

    console.log('\n--- Testing GET /api ---');
    const apiRes = await axios.get('http://127.0.0.1:3000/api');
    console.log('GET /api status:', apiRes.status, apiRes.data.message);

    console.log('\n--- Testing GET /wallpapers (No Category) ---');
    const wallpapersRes = await axios.get('http://127.0.0.1:3000/wallpapers');
    console.log('GET /wallpapers status:', wallpapersRes.status);

    console.log('\n--- Testing GET /search (Missing Query -> 400) ---');
    try {
      await axios.get('http://127.0.0.1:3000/search');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('GET /search status:', err.response.status, err.response.data.message);
      } else {
        throw err;
      }
    }

    console.log('\n--- Testing GET /wallpaper/1 (Valid ID) ---');
    const singleRes = await axios.get('http://127.0.0.1:3000/wallpaper/1');
    console.log('GET /wallpaper/1 status:', singleRes.status);

    console.log('\n--- Testing POST /favorites (Add ID 3) ---');
    const postFavRes = await axios.post('http://127.0.0.1:3000/favorites', { id: 3 });
    console.log('POST /favorites status:', postFavRes.status);

    console.log('\n--- Testing GET /favorites ---');
    const getFavRes = await axios.get('http://127.0.0.1:3000/favorites');
    console.log('GET /favorites count:', getFavRes.data.count);

    console.log('\n--- Testing DELETE /favorites/3 ---');
    const delFavRes = await axios.delete('http://127.0.0.1:3000/favorites/3');
    console.log('DELETE /favorites/3 status:', delFavRes.status);

    console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test failed:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status, err.response.headers);
    }
    process.exitCode = 1;
  } finally {
    server.kill();
    process.exit();
  }
}

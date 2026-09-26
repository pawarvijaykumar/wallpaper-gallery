/**
 * Wallpaper API Backend
 * 
 * Express server that serves random wallpapers using the Picsum Photos API (https://picsum.photos).
 */

require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Enable JSON body parsing middleware for handling POST request payloads
app.use(express.json());

// In-memory set to store favorited wallpaper IDs without duplicates
const favorites = new Set();

// List of predefined popular wallpaper resolutions (width x height)
const RESOLUTIONS = [
  { width: 1920, height: 1080, category: 'Desktop HD' },
  { width: 2560, height: 1440, category: 'Desktop QHD' },
  { width: 3840, height: 2160, category: 'Desktop 4K' },
  { width: 1080, height: 1920, category: 'Mobile Vertical' },
  { width: 1440, height: 900,  category: 'MacBook Air' },
  { width: 2880, height: 1800, category: 'MacBook Pro Retina' },
  { width: 2560, height: 1080, category: 'Ultrawide' },
  { width: 1280, height: 720,  category: 'HD Standard' },
  { width: 1536, height: 864,  category: 'Laptop Standard' },
  { width: 2048, height: 1536, category: 'Tablet / iPad' }
];

/**
 * Helper function to retrieve a formatted wallpaper object by numeric ID (1 to 10).
 * Optionally accepts a custom image seed to serve fresh random images.
 */
function getWallpaperById(id, customSeed = null) {
  if (isNaN(id) || id < 1 || id > RESOLUTIONS.length) return null;
  const resItem = RESOLUTIONS[id - 1];
  
  // Use custom seed or default to wallpaper ID seed
  const seed = customSeed || `wallpaper_${id}`;

  return {
    id: id,
    title: `Wallpaper #${id} (${resItem.category})`,
    width: resItem.width,
    height: resItem.height,
    category: resItem.category,
    url: `https://picsum.photos/seed/${seed}/${resItem.width}/${resItem.height}`,
    downloadUrl: `http://localhost:${PORT}/wallpaper/download?w=${resItem.width}&h=${resItem.height}`
  };
}

/**
 * 1. GET /wallpapers
 * Returns a JSON array of wallpapers with optional category filtering and fresh random seeds.
 */
app.get('/wallpapers', (req, res) => {
  let targetResolutions = RESOLUTIONS;

  // Read optional 'category' query parameter (e.g. GET /wallpapers?category=desktop)
  const requestedCategory = req.query.category;

  if (requestedCategory && typeof requestedCategory === 'string') {
    const filterLower = requestedCategory.trim().toLowerCase();
    
    // Filter resolutions array case-insensitively based on requested category
    targetResolutions = RESOLUTIONS.filter(resItem => 
      resItem.category.toLowerCase().includes(filterLower)
    );
  }

  // Read refresh token or generate fresh timestamp for dynamic seed generation
  const refreshKey = req.query.refresh || req.query.seed || `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  // Map matching resolutions to wallpaper response objects with fresh random seeds
  const wallpapers = targetResolutions.map((resItem, index) => {
    const originalId = RESOLUTIONS.indexOf(resItem) + 1;
    const dynamicSeed = `wallpaper_${originalId}_${refreshKey}_${index + 1}`;
    return getWallpaperById(originalId, dynamicSeed);
  });

  // Return the JSON list with count reflecting filtered items
  res.json({
    success: true,
    count: wallpapers.length,
    data: wallpapers
  });
});

/**
 * 2. GET /wallpaper/random
 * Redirects the client directly to a random Picsum image.
 */
app.get('/wallpaper/random', (req, res) => {
  const randomRes = RESOLUTIONS[Math.floor(Math.random() * RESOLUTIONS.length)];
  const randomId = Math.floor(Math.random() * 100000);
  const imageUrl = `https://picsum.photos/${randomRes.width}/${randomRes.height}?random=${randomId}`;

  console.log(`[GET /wallpaper/random] Redirecting to: ${imageUrl}`);
  res.redirect(imageUrl);
});

/**
 * 3. GET /wallpaper/download
 * Fetches a wallpaper image stream from Picsum and streams it back as a file attachment.
 */
app.get('/wallpaper/download', async (req, res) => {
  try {
    const width = parseInt(req.query.w, 10) || 1920;
    const height = parseInt(req.query.h, 10) || 1080;

    const seed = Math.floor(Math.random() * 100000);
    const targetUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;

    console.log(`[GET /wallpaper/download] Fetching image from: ${targetUrl}`);

    const response = await axios({
      method: 'get',
      url: targetUrl,
      responseType: 'stream'
    });

    const filename = `wallpaper_${width}x${height}_${Date.now()}.jpg`;

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    response.data.pipe(res);

  } catch (error) {
    console.error('[GET /wallpaper/download] Error fetching image:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to download wallpaper image from Picsum API.'
    });
  }
});

/**
 * 4. GET /wallpaper/:id
 * Returns a single wallpaper object by numeric ID (1-10), or HTTP 404 if not found.
 */
app.get('/wallpaper/:id', (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const wallpaper = getWallpaperById(targetId);

  if (!wallpaper) {
    return res.status(404).json({
      success: false,
      message: 'Wallpaper not found'
    });
  }

  res.json({
    success: true,
    data: wallpaper
  });
});

/**
 * 5. POST /favorites
 * Accepts JSON body {"id": 3} and adds that wallpaper ID to in-memory favorites.
 */
app.post('/favorites', (req, res) => {
  const { id } = req.body || {};
  const wallpaperId = parseInt(id, 10);

  if (isNaN(wallpaperId) || wallpaperId < 1 || wallpaperId > RESOLUTIONS.length) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallpaper ID'
    });
  }

  favorites.add(wallpaperId);

  res.status(201).json({
    success: true,
    message: `Wallpaper #${wallpaperId} added to favorites`,
    favorites: Array.from(favorites)
  });
});

/**
 * 6. GET /favorites
 * Returns full wallpaper objects for all favorited IDs.
 */
app.get('/favorites', (req, res) => {
  const favoritedList = Array.from(favorites).map(id => getWallpaperById(id));

  res.json({
    success: true,
    count: favoritedList.length,
    data: favoritedList
  });
});

/**
 * 7. DELETE /favorites/:id
 * Removes a wallpaper ID from favorites.
 */
app.delete('/favorites/:id', (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (!favorites.has(targetId)) {
    return res.status(404).json({
      success: false,
      message: 'Wallpaper not found in favorites'
    });
  }

  favorites.delete(targetId);

  res.json({
    success: true,
    message: `Wallpaper #${targetId} removed from favorites`,
    favorites: Array.from(favorites)
  });
});

/**
 * 8. GET /search?q=<query>
 * Searches for wallpapers via Pexels Photos API using PEXELS_API_KEY from .env.
 * Returns a simplified JSON list of image objects.
 */
app.get('/search', async (req, res) => {
  const query = req.query.q;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      success: false,
      message: "Query parameter 'q' is required (e.g. /search?q=nature)"
    });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || apiKey === 'your_pexels_api_key_here') {
    return res.status(500).json({
      success: false,
      message: 'PEXELS_API_KEY is not configured in .env file. Please add your free key from https://www.pexels.com/api/'
    });
  }

  try {
    const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query.trim())}&per_page=12`;
    
    console.log(`[GET /search] Calling Pexels API for query: "${query}"`);

    const response = await axios.get(pexelsUrl, {
      headers: {
        Authorization: apiKey
      }
    });

    const photos = response.data.photos || [];
    
    const formattedPhotos = photos.map(photo => ({
      id: photo.id,
      title: photo.alt || `Photo by ${photo.photographer}`,
      photographer: photo.photographer,
      width: photo.width,
      height: photo.height,
      category: 'Pexels Search',
      url: photo.src.large2x || photo.src.large || photo.src.original,
      downloadUrl: photo.src.original
    }));

    res.json({
      success: true,
      count: formattedPhotos.length,
      query: query,
      data: formattedPhotos
    });

  } catch (error) {
    console.error('[GET /search] Error fetching from Pexels API:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search results from Pexels API.'
    });
  }
});

// API discovery endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the Wallpaper API!',
    endpoints: {
      'GET /': 'Serves the interactive Web Frontend Wallpaper Gallery.',
      'GET /wallpapers': 'Returns a JSON list of wallpapers (supports optional ?category= query param).',
      'GET /search?q=': 'Searches wallpapers via Pexels API (requires PEXELS_API_KEY in .env).',
      'GET /wallpaper/:id': 'Returns a single wallpaper object by ID (1-10).',
      'GET /wallpaper/random': 'Redirects to a random wallpaper image URL.',
      'GET /wallpaper/download': 'Downloads a random wallpaper image directly as an attachment file.',
      'POST /favorites': 'Adds a wallpaper ID to favorites (e.g. {"id": 3}).',
      'GET /favorites': 'Returns full wallpaper objects for all favorited IDs.',
      'DELETE /favorites/:id': 'Removes a wallpaper ID from favorites.'
    }
  });
});

// Start listening for incoming HTTP requests
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Wallpaper Gallery running on http://localhost:${PORT}`);
  console.log(`Endpoints available:`);
  console.log(`  - Frontend Gallery: http://localhost:${PORT}/`);
  console.log(`  - GET    http://localhost:${PORT}/wallpapers`);
  console.log(`  - GET    http://localhost:${PORT}/search?q=<query>`);
  console.log(`  - GET    http://localhost:${PORT}/wallpaper/:id`);
  console.log(`  - GET    http://localhost:${PORT}/wallpaper/random`);
  console.log(`  - GET    http://localhost:${PORT}/wallpaper/download`);
  console.log(`  - POST   http://localhost:${PORT}/favorites`);
  console.log(`  - GET    http://localhost:${PORT}/favorites`);
  console.log(`  - DELETE http://localhost:${PORT}/favorites/:id`);
  console.log(`==================================================`);
});

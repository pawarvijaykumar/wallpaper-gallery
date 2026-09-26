# Wallpaper API Backend

A simple Node.js Express backend that serves random wallpapers using the [Picsum Photos API](https://picsum.photos). Built with `express` and `axios`.

## Features & Endpoints

### 1. `GET /wallpapers`
Returns a JSON array of wallpaper objects with optional case-insensitive category filtering (`?category=desktop`).

```bash
curl http://localhost:3000/wallpapers?category=desktop
```

### 2. `GET /search?q=<query>`
Searches wallpapers via Pexels Photos API using `PEXELS_API_KEY` from `.env`.

**Example Request:**
```bash
curl http://localhost:3000/search?q=nature
```

### 3. `GET /wallpaper/:id`
Returns a single wallpaper object by ID (1-10). Returns HTTP 404 if not found.

```bash
curl http://localhost:3000/wallpaper/1
```

### 3. `GET /wallpaper/random`
Redirects the client directly to a random wallpaper image on Picsum (HTTP 302 Redirect).

```bash
curl -I http://localhost:3000/wallpaper/random
```

### 4. `GET /wallpaper/download`
Downloads a wallpaper image stream from Picsum with a `Content-Disposition: attachment` header.

```bash
curl -O -J http://localhost:3000/wallpaper/download
```

### 5. `POST /favorites`
Adds a wallpaper ID to the in-memory favorites list.

```bash
curl -X POST http://localhost:3000/favorites \
  -H "Content-Type: application/json" \
  -d '{"id": 3}'
```

### 6. `GET /favorites`
Returns full wallpaper objects for all favorited IDs.

```bash
curl http://localhost:3000/favorites
```

### 7. `DELETE /favorites/:id`
Removes a wallpaper ID from the favorites list.

```bash
curl -X DELETE http://localhost:3000/favorites/3
```

---

## How to Run & Test

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Server:**
   ```bash
   npm start
   ```

3. **Run Automated Test Suite:**
   ```bash
   npm test
   ```

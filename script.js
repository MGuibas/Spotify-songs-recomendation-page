// Declaramos las variables en el alcance global
let accessToken;
let playlistId;
let currentTrackIndex = -1;
let tracks = [];
let likedTracks = [];
let dislikedTracks = [];
let history = [];
let userId;

// Configuración de Spotify
const clientId = '3d46321079184aa3a9d9a93c74365225';
const redirectUri = 'https://mguibas.github.io/Spotify-songs-recomendation-page/';
const scopes = [
  'playlist-read-private',
  'playlist-modify-private',
  'user-top-read',
  'user-library-read'
];

// Aseguramos que todas las funciones estén en el alcance global
window.login = function() {
  const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}`;
  window.location.href = authUrl;
}

window.getAccessTokenFromUrl = function() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get('access_token');
}

window.fetchWebApi = async function(endpoint, method, body) {
  if (!accessToken) {
    console.error('No access token available');
    return null;
  }
  try {
    const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      method,
      body: body ? JSON.stringify(body) : undefined
    });

    if (res.status === 401) {
      console.error('Token expired or invalid. Please re-authenticate.');
      window.location.href = `${redirectUri}?error=invalid_token`;
      return null;
    }
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '1');
      console.warn(`Rate limit exceeded. Retrying in ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return window.fetchWebApi(endpoint, method, body);
    }
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching API:', error);
    return null;
  }
}

window.getUserId = async function() {
  if (!userId) {
    const userData = await window.fetchWebApi('me', 'GET');
    if (userData) userId = userData.id;
  }
  return userId;
}

window.getOrCreatePlaylist = async function() {
  if (!playlistId) {
    const playlists = await window.fetchWebApi('me/playlists', 'GET');
    if (playlists) {
      const playlist = playlists.items.find(pl => pl.name === 'Canciones Spotify TikTok');
      
      if (playlist) {
        playlistId = playlist.id;
      } else {
        const newPlaylist = await window.fetchWebApi(`users/${await window.getUserId()}/playlists`, 'POST', {
          name: 'Canciones Spotify TikTok',
          description: 'Playlist creada automáticamente para canciones de la aplicación Spotify TikTok',
          public: false
        });
        if (newPlaylist) playlistId = newPlaylist.id;
      }
    }
  }
  console.log('Playlist ID:', playlistId);
  return playlistId;
}

window.saveToPlaylist = async function() {
  const track = tracks[currentTrackIndex];
  if (!track) return;
  const playlist = await window.getOrCreatePlaylist();
  if (playlist) {
    await window.fetchWebApi(`playlists/${playlist}/tracks`, 'POST', {
      uris: [track.uri]
    });
    console.log(`Saved to playlist: ${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`);
  }
}

window.getRecommendedTracks = async function(seedTracks) {
  if (seedTracks.length === 0) {
    console.error('No seed tracks available to get recommendations.');
    return [];
  }

  const seed = seedTracks.map(track => track.id).join(',');
  try {
    const recommendations = await window.fetchWebApi(`recommendations?limit=10&seed_tracks=${seed}`, 'GET');
    if (recommendations) {
      return recommendations.tracks.filter(track => track.preview_url && !dislikedTracks.includes(track.id));
    }
  } catch (error) {
    console.error('Error getting recommended tracks:', error);
  }
  return [];
}

window.loadMoreTracks = async function() {
  let seedTracks;
  if (tracks.length > 0) {
    seedTracks = tracks.slice(-5);
  } else {
    const topTracks = await window.fetchWebApi('me/top/tracks?limit=5', 'GET');
    seedTracks = topTracks ? topTracks.items : [];
  }

  seedTracks = [...seedTracks, ...likedTracks];
  try {
    const newTracks = await window.getRecommendedTracks(seedTracks);
    tracks.push(...newTracks);
  } catch (error) {
    console.error('Error loading more tracks:', error);
  }
}

window.playNext = async function() {
  currentTrackIndex++;
  
  if (currentTrackIndex >= tracks.length) {
    await window.loadMoreTracks();
  }

  if (tracks[currentTrackIndex]) {
    window.playTrack(tracks[currentTrackIndex]);
    history.push(currentTrackIndex);
  }
}

window.playPrevious = function() {
  if (history.length > 1) {
    history.pop();
    currentTrackIndex = history[history.length - 1];
    window.playTrack(tracks[currentTrackIndex]);
  }
}

window.playTrack = function(track) {
  if (track && track.preview_url) {
    document.getElementById('track-name').innerText = track.name;
    document.getElementById('track-artist').innerText = track.artists.map(artist => artist.name).join(', ');
    document.getElementById('album-image').src = track.album.images[0].url;
    const audio = document.getElementById('track-audio');
    audio.src = track.preview_url;
    audio.play();
  } else {
    console.log('Track or preview URL not available.');
  }
}

window.dislikeTrack = function() {
  const track = tracks[currentTrackIndex];
  if (track) {
    dislikedTracks.push(track.id);
    console.log(`Disliked: ${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`);
    window.playNext();
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('track-audio');
  audio.addEventListener('ended', window.playNext);

  accessToken = window.getAccessTokenFromUrl();
  if (!accessToken) {
    window.login();
  } else {
    document.getElementById('login-button').classList.add('hidden');
    document.getElementById('track').classList.remove('hidden');
    document.getElementById('controls').classList.remove('hidden');
    window.loadMoreTracks().then(() => window.playNext());
  }
});

let accessToken;
let userId; // Define userId aquí
let playlistId;
let currentTrackIndex = -1;
let tracks = [];
let likedTracks = [];
let dislikedTracks = [];
let history = [];

// Configura tus credenciales de Spotify
const clientId = '3d46321079184aa3a9d9a93c74365225';  // Reemplaza con tu Client ID
const redirectUri = 'https://mguibas.github.io/Spotify-songs-recomendation-page/';  // Reemplaza con tu Redirect URI
const scopes = [
  'playlist-read-private',
  'playlist-modify-private',
  'user-top-read',
  'user-library-read'
];

function login() {
  const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}`;
  window.location.href = authUrl;
}

function getAccessTokenFromUrl() {
  const params = new URLSearchParams(window.location.hash.replace('#', '?'));
  return params.get('access_token');
}

async function fetchWebApi(endpoint, method, body) {
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
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching API:', error);
    return null;
  }
}

async function getUserId() {
  if (!userId) {
    const userData = await fetchWebApi('me', 'GET');
    if (userData) userId = userData.id;
  }
  return userId;
}

async function getOrCreatePlaylist() {
  if (!playlistId) {
    const playlists = await fetchWebApi('me/playlists', 'GET');
    if (playlists) {
      console.log('Playlists:', playlists);
      const playlist = playlists.items.find(pl => pl.name === 'Canciones Spotify TikTok');
      
      if (playlist) {
        playlistId = playlist.id;
      } else {
        const newPlaylist = await fetchWebApi(`users/${await getUserId()}/playlists`, 'POST', {
          name: 'Canciones Spotify TikTok',
          description: 'Playlist creada automáticamente para canciones de la aplicación Spotify TikTok',
          public: false
        });
        if (newPlaylist) {
          playlistId = newPlaylist.id;
          console.log('Created new playlist:', newPlaylist);
        }
      }
    }
  }
  console.log('Playlist ID:', playlistId);
  return playlistId;
}

async function saveToPlaylist() {
  const track = tracks[currentTrackIndex];
  if (!track) {
    console.error('No track available to save.');
    return;
  }
  const playlist = await getOrCreatePlaylist();
  if (!playlist) {
    console.error('No playlist available to save to.');
    return;
  }
  const response = await fetchWebApi(`playlists/${playlist}/tracks`, 'POST', {
    uris: [track.uri]
  });
  if (response) {
    console.log(`Saved to playlist: ${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`);
  } else {
    console.error('Failed to save track to playlist.');
  }
}

async function getRecommendedTracks(seedTracks) {
  if (seedTracks.length === 0) {
    console.error('No seed tracks available to get recommendations.');
    return [];
  }

  const seed = seedTracks.map(track => track.id).join(',');
  try {
    const recommendations = await fetchWebApi(`recommendations?limit=10&seed_tracks=${seed}`, 'GET');
    if (recommendations) {
      return recommendations.tracks.filter(track => track.preview_url && !dislikedTracks.includes(track.id));
    }
  } catch (error) {
    console.error('Error getting recommended tracks:', error);
  }
  return [];
}

async function loadMoreTracks() {
  let seedTracks;
  if (tracks.length > 0) {
    seedTracks = tracks.slice(-5); 
  } else {
    const topTracks = await fetchWebApi('me/top/tracks?limit=5', 'GET');
    seedTracks = topTracks ? topTracks.items : [];
  }

  seedTracks = [...seedTracks, ...likedTracks];
  const newTracks = await getRecommendedTracks(seedTracks);
  tracks.push(...newTracks);
}

async function playNext() {
  currentTrackIndex++;
  
  if (currentTrackIndex >= tracks.length) {
    await loadMoreTracks();
  }

  if (tracks[currentTrackIndex]) {
    playTrack(tracks[currentTrackIndex]);
    history.push(currentTrackIndex);
  }
}

function playPrevious() {
  if (history.length > 1) {
    history.pop(); 
    currentTrackIndex = history[history.length - 1];
    playTrack(tracks[currentTrackIndex]);
  }
}

function playTrack(track) {
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

function dislikeTrack() {
  const track = tracks[currentTrackIndex];
  if (track) {
    dislikedTracks.push(track.id);
    console.log(`Disliked: ${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`);
    playNext();
  }
}

const audio = document.getElementById('track-audio');
audio.addEventListener('ended', playNext);

document.addEventListener('DOMContentLoaded', () => {
  accessToken = getAccessTokenFromUrl();
  if (!accessToken) {
    login();
  } else {
    document.getElementById('login-button').classList.add('hidden');
    document.getElementById('track').classList.remove('hidden');
    document.getElementById('controls').classList.remove('hidden');
    loadMoreTracks().then(() => playNext());
  }
});


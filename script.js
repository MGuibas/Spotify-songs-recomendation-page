const clientId = '3d46321079184aa3a9d9a93c74365225';
const redirectUri = 'http://127.0.0.1:5500/spotify.html';
const scopes = 'user-top-read user-read-recently-played playlist-modify-private playlist-read-private';

let accessToken;
let userId;
let playlistId;
let currentTrackIndex = -1;
let tracks = [];
let likedTracks = [];
let dislikedTracks = [];
let history = [];

function login() {
  const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
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
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method,
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching API:', error);
    return null;
  }
}

async function getUserId() {
  if (!userId) {
    const userData = await fetchWebApi('v1/me', 'GET');
    if (userData) userId = userData.id;
  }
  return userId;
}

async function getOrCreatePlaylist() {
  if (!playlistId) {
    const playlists = await fetchWebApi('v1/me/playlists', 'GET');
    if (playlists) {
      const playlist = playlists.items.find(pl => pl.name === 'Canciones Spotify TikTok');
      
      if (playlist) {
        playlistId = playlist.id;
      } else {
        const newPlaylist = await fetchWebApi(`v1/users/${await getUserId()}/playlists`, 'POST', {
          name: 'Canciones Spotify TikTok',
          description: 'Playlist creada automáticamente para canciones de la aplicación Spotify TikTok',
          public: false
        });
        if (newPlaylist) playlistId = newPlaylist.id;
      }
    }
  }
  return playlistId;
}

async function saveToPlaylist() {
  const track = tracks[currentTrackIndex];
  if (!track) return;
  const playlist = await getOrCreatePlaylist();
  await fetchWebApi(`v1/playlists/${playlist}/tracks`, 'POST', {
    uris: [track.uri]
  });
  console.log(`Saved to playlist: ${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`);
}

async function getRecommendedTracks(seedTracks) {
  const seed = seedTracks.map(track => track.id).join(',');
  try {
    const recommendations = await fetchWebApi(`v1/recommendations?limit=10&seed_tracks=${seed}`, 'GET');
    if (recommendations) return recommendations.tracks.filter(track => track.preview_url && !dislikedTracks.includes(track.id));
  } catch (error) {
    console.error('Error getting recommended tracks:', error);
  }
  return [];
}

async function loadMoreTracks() {
  let seedTracks = tracks.length > 0 ? tracks.slice(-5) : await fetchWebApi('v1/me/top/tracks?limit=5', 'GET').then(data => data.items);
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
    history.pop(); // Remove current track
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

// Reproduce la siguiente canción automáticamente cuando termine la actual
const audio = document.getElementById('track-audio');
audio.addEventListener('ended', playNext);

// Manejo del token y carga de canciones
document.addEventListener('DOMContentLoaded', () => {
  accessToken = getAccessTokenFromUrl();
  if (accessToken) {
    document.getElementById('login-button').classList.add('hidden');
    document.getElementById('track').classList.remove('hidden');
    document.getElementById('controls').classList.remove('hidden');
    loadMoreTracks().then(() => playNext());
  }
});

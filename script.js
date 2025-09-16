const clientId = '12c41f260c314ff0944177931dd7a931';
const redirectUri = window.location.origin;
const scopes = 'user-top-read user-read-recently-played playlist-modify-private';

let accessToken;
let tracks = [];
let index = 0;
const audio = new Audio();

function login() {
  const url = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
  window.location.href = url;
}

function getToken() {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.replace('#', '?'));
  return params.get('access_token');
}

async function fetchWebApi(endpoint) {
  const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  return res.json();
}

async function loadTracks() {
  const topTracks = await fetchWebApi('me/top/tracks?limit=5');
  const seed = topTracks.items.map(t => t.id).join(',');
  const recs = await fetchWebApi(`recommendations?limit=10&seed_tracks=${seed}`);
  tracks = recs.tracks.filter(t => t.preview_url);
  playTrack(index);
}

function playTrack(i) {
  const track = tracks[i];
  if (!track) return;
  document.getElementById('album-cover').src = track.album.images[0].url;
  document.getElementById('track-name').textContent = track.name;
  document.getElementById('track-artist').textContent = track.artists.map(a => a.name).join(', ');
  audio.src = track.preview_url;
  audio.play();
}

function next() {
  index = (index + 1) % tracks.length;
  playTrack(index);
}

function prev() {
  index = (index - 1 + tracks.length) % tracks.length;
  playTrack(index);
}

function togglePlay() {
  if (audio.paused) audio.play(); else audio.pause();
}

function like() {
  // Aquí puedes guardar la canción en una playlist
  next();
}

function dislike() {
  next();
}

document.getElementById('login-button').onclick = login;
document.getElementById('play-pause-btn').onclick = togglePlay;
document.getElementById('next-btn').onclick = next;
document.getElementById('prev-btn').onclick = prev;
document.getElementById('like-btn').onclick = like;
document.getElementById('dislike-btn').onclick = dislike;

// Swipe móvil
let startY = 0;
document.addEventListener('touchstart', e => startY = e.touches[0].clientY);
document.addEventListener('touchend', e => {
  const endY = e.changedTouches[0].clientY;
  if (startY - endY > 50) next();
  if (endY - startY > 50) prev();
});

// Init
accessToken = getToken();
if (accessToken) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('player-screen').classList.remove('hidden');
  loadTracks();
}


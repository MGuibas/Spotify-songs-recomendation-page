const clientId = 'b6a4fbf9f4fc4646b8862fc9d157d071'; // Make sure this is correct
const redirectUri = 'https://mguibas.github.io/Spotify-songs-recomendation-page/';
const scopes = 'user-top-read user-read-recently-played playlist-modify-private playlist-read-private';

let accessToken;
let userId;
let playlistId;
let currentTrackIndex = -1;
let tracks = [];
let likedTracks = [];
let dislikedTracks = [];
let history = [];
let audio = new Audio();

function login() {
  console.log('Login function called'); // Add this line
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
    
    audio.src = track.preview_url;
    audio.play();
    updatePlayPauseButton();

    // Update the link to the song on Spotify
    const trackLink = document.getElementById('track-link');
    trackLink.href = track.external_urls.spotify;
  } else {
    console.log('Track or preview URL not available.');
  }
}

function updatePlayPauseButton() {
  document.getElementById('vinyl-wrapper').style.display = 'none'; //para pasar de pagina q cambie
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (audio.paused) {
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
  } else {
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
  }
}

function togglePlayPause() {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
  updatePlayPauseButton();
}

function setVolume(value) {
  audio.volume = value;
}

function dislikeTrack() {
  const track = tracks[currentTrackIndex];
  if (track) {
    dislikedTracks.push(track.id);
    console.log(`Disliked: ${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`);
    playNext();
  }
}

async function searchArtists(query) {
  if (query.trim() === '') return [];
  const response = await fetchWebApi(`v1/search?q=${encodeURIComponent(query)}&type=artist&limit=5`, 'GET');
  return response.artists.items;
}

async function fetchRecommendationsByArtist(artistId) {
  const recommendations = await fetchWebApi(`v1/recommendations?limit=10&seed_artists=${artistId}`, 'GET');
  if (recommendations && recommendations.tracks) {
    tracks = recommendations.tracks;
    currentTrackIndex = -1;
    playNext();
  } else {
    console.log('No se encontraron recomendaciones para este artista.');
  }
}

let debounceTimer;

function setupArtistSearch() {
  const artistInput = document.getElementById('artist-input');
  const artistSuggestions = document.getElementById('artist-suggestions');

  artistInput.addEventListener('input', async (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const query = e.target.value;
      if (query) {
        const suggestions = await searchArtists(query);
        displayArtistSuggestions(suggestions);
      } else {
        artistSuggestions.innerHTML = '';
        artistSuggestions.classList.add('hidden');
      }
    }, 300);
  });
}

function displayArtistSuggestions(suggestions) {
  const artistSuggestions = document.getElementById('artist-suggestions');
  artistSuggestions.innerHTML = '';

  if (suggestions.length > 0) {
    suggestions.forEach(artist => {
      const div = document.createElement('div');
      div.className = 'artist-suggestion';
      div.textContent = artist.name;
      div.addEventListener('click', () => {
        fetchRecommendationsByArtist(artist.id);
        document.getElementById('artist-input').value = '';
        artistSuggestions.innerHTML = '';
        artistSuggestions.classList.add('hidden');
      });
      artistSuggestions.appendChild(div);
    });
    artistSuggestions.classList.remove('hidden');
  } else {
    artistSuggestions.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  accessToken = getAccessTokenFromUrl();
  
  if (accessToken) {
    document.getElementById('login-button').classList.add('hidden');
    document.getElementById('track').classList.remove('hidden');
    document.getElementById('controls').classList.remove('hidden');
    document.getElementById('artist-form').classList.remove('hidden');

    try {
      await getOrCreatePlaylist();
      await loadMoreTracks();
      playNext();
      setupArtistSearch();

      // Add event listeners for new controls
      document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);
      document.getElementById('prev-btn').addEventListener('click', playPrevious);
      document.getElementById('next-btn').addEventListener('click', playNext);
      document.getElementById('dislike-btn').addEventListener('click', dislikeTrack);
      document.getElementById('save-btn').addEventListener('click', saveToPlaylist);
      document.getElementById('volume-slider').addEventListener('input', (e) => setVolume(e.target.value));

      // Update play/pause button when audio ends
      audio.addEventListener('ended', () => {
        updatePlayPauseButton();
        playNext();
      });
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }
});

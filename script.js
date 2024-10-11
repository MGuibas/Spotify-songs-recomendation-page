const clientId = 'b6a4fbf9f4fc4646b8862fc9d157d071';
const redirectUri = 'https://mguibas.github.io/Spotify-songs-recomendation-page/';
const scopes = 'user-top-read user-read-recently-played playlist-modify-private playlist-read-private';
let accessToken;
let userId;
let playlistId;
let currentTrackIndex = -1;
let tracks = [];
let likedTracks = [];
let dislikedTracks = [];
let audio = new Audio();

function login() {
    const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
    window.location.href = authUrl;
}

function getAccessTokenFromUrl() {
    const params = new URLSearchParams(window.location.hash.replace('#', '?'));
    const token = params.get('access_token');
    if (token) {
        accessToken = token;
    }
    return accessToken;
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
            const playlist = playlists.items.find(pl => pl.name === 'Recomendaciones Spotify');
            
            if (playlist) {
                playlistId = playlist.id;
            } else {
                const newPlaylist = await fetchWebApi(`v1/users/${await getUserId()}/playlists`, 'POST', {
                    name: 'Recomendaciones Spotify',
                    description: 'Playlist creada automáticamente para canciones de la web que ha hecho marquitos, Miau',
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
    }
}

function playPrevious() {
    if (currentTrackIndex > 0) {
        currentTrackIndex--;
        playTrack(tracks[currentTrackIndex]);
    }
}

function playTrack(track) {
    if (track && track.preview_url) {
        document.getElementById('track-name').innerText = track.name;
        document.getElementById('track-artist').innerText = track.artists.map(artist => artist.name).join(', ');
        document.getElementById('album-cover').src = track.album.images[0].url;
        
        audio.src = track.preview_url;
        audio.play();
        updatePlayPauseButton();
    } else {
        console.log('Track or preview URL not available.');
    }
}

function updatePlayPauseButton() {
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

function likeTrack() {
    const track = tracks[currentTrackIndex];
    if (track) {
        likedTracks.push(track.id);
        saveToPlaylist();
        playNext();
    }
}

function dislikeTrack() {
    const track = tracks[currentTrackIndex];
    if (track) {
        dislikedTracks.push(track.id);
        playNext();
    }
}

let startY;
let currentY;

function handleTouchStart(e) {
    startY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    if (!startY) return;
    currentY = e.touches[0].clientY;
    const diffY = currentY - startY;
    const trackContainer = document.querySelector('.track');
    trackContainer.style.transform = `translateY(${diffY}px)`;
}

function handleTouchEnd() {
    if (!startY || !currentY) return;
    const diffY = currentY - startY;
    const trackContainer = document.querySelector('.track');
    if (diffY < -50) {
        playNext();
    } else if (diffY > 50) {
        playPrevious();
    }
    trackContainer.style.transform = '';
    startY = null;
    currentY = null;
}

document.addEventListener('DOMContentLoaded', async () => {
    accessToken = getAccessTokenFromUrl();
    
    if (accessToken) {
        document.getElementById('login-button').classList.add('hidden');
        document.getElementById('controls').classList.remove('hidden');
        document.getElementById('like-btn').classList.remove('hidden');
        document.getElementById('dislike-btn').classList.remove('hidden');
        try {
            await getOrCreatePlaylist();
            await loadMoreTracks();
            playNext();
            document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);
            document.getElementById('prev-btn').addEventListener('click', playPrevious);
            document.getElementById('next-btn').addEventListener('click', playNext);
            document.getElementById('like-btn').addEventListener('click', likeTrack);
            document.getElementById('dislike-btn').addEventListener('click', dislikeTrack);
            const trackContainer = document.getElementById('track-container');
            trackContainer.addEventListener('touchstart', handleTouchStart);
            trackContainer.addEventListener('touchmove', handleTouchMove);
            trackContainer.addEventListener('touchend', handleTouchEnd);
            audio.addEventListener('ended', () => {
                updatePlayPauseButton();
                playNext();
            });
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    } else {
        document.getElementById('login-button').addEventListener('click', login);
    }
});

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
let likedGenres = [];
let dislikedGenres = [];
let playedTracks = [];
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

async function getRecommendedTracks(seedTracks, seedArtists = [], seedGenres = []) {
    const seed_tracks = seedTracks.map(track => track.id).join(',');
    const seed_artists = seedArtists.join(',');
    const seed_genres = [...new Set([...seedGenres, ...likedGenres])].slice(0, 5).join(',');
    try {
        const recommendations = await fetchWebApi(`v1/recommendations?limit=50&seed_tracks=${seed_tracks}&seed_artists=${seed_artists}&seed_genres=${seed_genres}`, 'GET');
        if (recommendations) {
            return recommendations.tracks.filter(track => 
                track.preview_url && 
                !dislikedTracks.includes(track.id) &&
                !dislikedGenres.some(genre => track.artists.some(artist => artist.genres && artist.genres.includes(genre))) &&
                !playedTracks.includes(track.id)
            );
        }
    } catch (error) {
        console.error('Error getting recommended tracks:', error);
    }
    return [];
}

async function loadMoreTracks() {
    let newTracks = [];
    if (tracks.length > 0) {
        const seedTracks = tracks.slice(-5);
        const seedArtists = [...new Set(tracks.flatMap(track => track.artists.map(artist => artist.id)))].slice(0, 2);
        const seedGenres = await getTopGenres(seedArtists);
        newTracks = await getRecommendedTracks(seedTracks, seedArtists, seedGenres);
    } else {
        const topTracks = await fetchWebApi('v1/me/top/tracks?limit=5', 'GET').then(data => data.items);
        const topArtists = await fetchWebApi('v1/me/top/artists?limit=2', 'GET').then(data => data.items);
        const topGenres = topArtists.flatMap(artist => artist.genres).slice(0, 2);
        newTracks = await getRecommendedTracks(topTracks, topArtists.map(artist => artist.id), topGenres);
    }
    
    // Filtrar las canciones ya reproducidas
    newTracks = newTracks.filter(track => !playedTracks.includes(track.id));
    
    tracks.push(...newTracks);
}
async function getTopGenres(artistIds) {
    const artists = await Promise.all(artistIds.map(id => fetchWebApi(`v1/artists/${id}`, 'GET')));
    const genres = artists.flatMap(artist => artist.genres);
    return [...new Set(genres)].slice(0, 2);
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

async function playTrack(track) {
    if (track && track.preview_url) {
        document.getElementById('track-name').innerText = track.name;
        document.getElementById('track-artist').innerText = track.artists.map(artist => artist.name).join(', ');
        document.getElementById('album-cover').src = track.album.images[0].url;

        audio.src = track.preview_url;
        audio.play();
        updatePlayPauseButton();
        
        // Agregar la pista a las reproducidas
        playedTracks.push(track.id);
        
        // Limitar playedTracks a las últimas 100 canciones
        if (playedTracks.length > 100) {
            playedTracks = playedTracks.slice(-100);
        }
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

async function likeTrack() {
    const track = tracks[currentTrackIndex];
    if (track) {
        likedTracks.push(track.id);
        const artistGenres = await getArtistGenres(track.artists[0].id);
        likedGenres = [...new Set([...likedGenres, ...artistGenres])];
        saveToPlaylist();
        playNext();
    }
}

async function dislikeTrack() {
    const track = tracks[currentTrackIndex];
    if (track) {
        dislikedTracks.push(track.id);
        const artistGenres = await getArtistGenres(track.artists[0].id);
        dislikedGenres = [...new Set([...dislikedGenres, ...artistGenres])];
        playNext();
    }
}

async function getArtistGenres(artistId) {
    const artist = await fetchWebApi(`v1/artists/${artistId}`, 'GET');
    return artist.genres || [];
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

async function searchArtists(query) {
    const response = await fetchWebApi(`v1/search?q=${encodeURIComponent(query)}&type=artist&limit=5`, 'GET');
    return response.artists.items;
}

function displayArtistSuggestions(artists) {
    const suggestionsContainer = document.getElementById('artist-suggestions');
    suggestionsContainer.innerHTML = '';
    artists.forEach(artist => {
        const suggestion = document.createElement('div');
        suggestion.classList.add('artist-suggestion');
        suggestion.textContent = artist.name;
        suggestion.addEventListener('click', () => selectArtist(artist));
        suggestionsContainer.appendChild(suggestion);
    });
    suggestionsContainer.classList.remove('hidden');
}

async function selectArtist(artist) {
    document.getElementById('artist-input').value = artist.name;
    document.getElementById('artist-suggestions').classList.add('hidden');

    const artistTracks = await getArtistTracks(artist.id);
    const relatedArtists = await getRelatedArtists(artist.id);
    const relatedArtistsTracks = await getRelatedArtistsTracks(relatedArtists);

    tracks = shuffleArray([...artistTracks, ...relatedArtistsTracks]);
    currentTrackIndex = -1;
    playNext();
}

async function getArtistTracks(artistId) {
    const topTracks = await fetchWebApi(`v1/artists/${artistId}/top-tracks?market=US`, 'GET');
    const albums = await fetchWebApi(`v1/artists/${artistId}/albums?include_groups=album,single&market=US&limit=50`, 'GET');
    
    let allTracks = topTracks.tracks;
    
    for (let album of albums.items) {
        const albumTracks = await fetchWebApi(`v1/albums/${album.id}/tracks`, 'GET');
        allTracks = allTracks.concat(albumTracks.items);
    }
    
    return shuffleArray(allTracks).slice(0, 20).filter(track => track.preview_url);
}

async function getRelatedArtists(artistId) {
    const related = await fetchWebApi(`v1/artists/${artistId}/related-artists`, 'GET');
    return related.artists.slice(0, 5);
}

async function getRelatedArtistsTracks(relatedArtists) {
    let tracks = [];
    for (let artist of relatedArtists) {
        const artistTracks = await getArtistTracks(artist.id);
        tracks = tracks.concat(artistTracks.slice(0, 4));
    }
    return tracks;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
async function getRecommendedTracksForArtist(artistId) {
    const response = await fetchWebApi(`v1/recommendations?limit=10&seed_artists=${artistId}`, 'GET');
    return response.tracks.filter(track => track.preview_url && !dislikedTracks.includes(track.id));
}





document.addEventListener('DOMContentLoaded', async () => {
    accessToken = getAccessTokenFromUrl();

    if (accessToken) {
        document.getElementById('login-button').classList.add('hidden');
        document.getElementById('controls').classList.remove('hidden');
        document.getElementById('like-btn').classList.remove('hidden');
        document.getElementById('dislike-btn').classList.remove('hidden');
        document.getElementById('artist-form').classList.remove('hidden');

        const artistInput = document.getElementById('artist-input');
        artistInput.addEventListener('input', async (e) => {
            const query = e.target.value;
            if (query.length > 2) {
                const artists = await searchArtists(query);
                displayArtistSuggestions(artists);
            } else {
                document.getElementById('artist-suggestions').classList.add('hidden');
            }
        });

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

:root {
  --spotify-green: #1DB954;
  --spotify-black: #191414;
}

body {
  font-family: 'Arial', sans-serif;
  background: linear-gradient(135deg, var(--spotify-black), #121212);
  color: white;
  height: 100vh;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  background-color: rgba(25, 20, 20, 0.8);
  border-radius: 15px;
  padding: 30px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.container:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
}

#track {
  text-align: center;
  margin-bottom: 20px;
}

#album-cover {
  width: 200px;
  height: 200px;
  margin: 0 auto 20px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

#album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

#album-cover:hover img {
  transform: scale(1.1);
}

#track-name {
  font-size: 24px;
  margin-bottom: 5px;
  color: var(--spotify-green);
}

#track-artist {
  font-size: 18px;
  color: #A0A0A0;
  margin-bottom: 15px;
}

#track-audio {
  width: 100%;
  margin-bottom: 20px;
}

#controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

button {
  background-color: var(--spotify-green);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
}

button:hover {
  background-color: #1ed760;
  transform: scale(1.05);
}

button:active {
  transform: scale(0.95);
}

#login-button {
  display: block;
  width: 100%;
  padding: 15px;
  font-size: 18px;
  margin-top: 20px;
  background-color: #FFFFFF;
  color: var(--spotify-black);
}

#login-button:hover {
  background-color: #F0F0F0;
}

.hidden {
  display: none !important;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.5s ease-out;
}

@media (max-width: 480px) {
  .container {
    width: 95%;
    padding: 20px;
  }

  #controls {
    flex-wrap: wrap;
    justify-content: center;
  }

  button {
    margin: 5px;
    padding: 10px 15px;
    font-size: 12px;
  }

  #album-cover {
    width: 150px;
    height: 150px;
  }
}

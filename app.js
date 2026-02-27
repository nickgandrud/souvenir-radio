const AZURACAST_BASE = "";
const STATION_SHORTCODE = "test_";

const FALLBACK_STREAM_URL = "/listen/test_/radio.mp3";

// AzuraCast static Now Playing JSON:
// http(s)://host/api/nowplaying_static/<station_shortcode>.json
// Docs: https://www.azuracast.com/docs/developers/now-playing-data/  (see "Static Now Playing JSON File") :contentReference[oaicite:2]{index=2}


const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const stopBtn = document.getElementById("stop");
const livePill = document.getElementById("live");

console.log({
  audio,
  playBtn,
  stopBtn,
  livePill
});

function setText(id, text) { document.getElementById(id).textContent = text || ""; }
function setArt(url, alt) {
  const art = document.getElementById("art");

  if (!url) {
    art.removeAttribute("src");
    art.alt = "";
    art.style.display = "none";
    return;
  }

  // If URL is relative, make it absolute to AzuraCast
  if (!/^https?:\/\//i.test(url)) {
    url = `${AZURACAST_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  art.style.display = "";
  art.src = url;
  art.alt = alt || "Album art";
}

//Asynchronously fetches the static json from the radio broadcast on Azuracast
async function fetchNowPlaying() {
  const url = `${AZURACAST_BASE}/api/nowplaying_static/${STATION_SHORTCODE}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`NowPlaying fetch failed: ${res.status}`);
  
  return res.json();
}

function updateUI(np) {
  const song = np?.now_playing?.song;
  const artist = song?.artist;
  const title = song?.title;

  setText("track", [artist, title].filter(Boolean).join(" — ") || np?.now_playing?.text || "—");

  const isLive = !!np?.live?.is_live;
  livePill.hidden = !isLive;

  const djName = np?.live?.streamer_name || np?.live?.streamer;
  setText("dj", djName ? `DJ: ${djName}` : "");

  const listeners = np?.listeners?.current;
  setText("listeners", (typeof listeners === "number") ? `Listeners: ${listeners}` : "");

  setArt(song?.art || song?.art_url, `${artist || ""} ${title || ""}`.trim());
}

async function refresh() {
  try {
    const np = await fetchNowPlaying();
    console.log(np);
    updateUI(np);
  } catch (e) {
    console.warn(e);
    setText("track", "Metadata not loading yet (check config).");
  }
}

playBtn.addEventListener("click", async () => {
  audio.src = FALLBACK_STREAM_URL;
  console.log("Trying to play:", audio.src);
  try {
    await audio.play();
    playBtn.disabled = true;
  } catch (e) {
    console.error(e);
    alert("Playback failed. Check the stream URL / format.");
  }
});

stopBtn.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
  playBtn.disabled = false;
});

refresh();
setInterval(refresh, 15000);
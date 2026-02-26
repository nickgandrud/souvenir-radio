const AZURACAST_BASE = "";
const STATION_SHORTCODE = "test_";

const FALLBACK_STREAM_URL = "";

// AzuraCast static Now Playing JSON:
// http(s)://host/api/nowplaying_static/<station_shortcode>.json
// Docs: https://www.azuracast.com/docs/developers/now-playing-data/  (see "Static Now Playing JSON File") :contentReference[oaicite:2]{index=2}


const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const stopBtn = document.getElementById("stop");
const livePill = document.getElementById("live");
const streamSelect = document.getElementById("streamSelect");

function setText(id, text) { document.getElementById(id).textContent = text || ""; }
function setArt(url, alt) {
  const art = document.getElementById("art");
  if (!url) { art.removeAttribute("src"); art.alt = ""; art.style.display = "none"; return; }
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

function populateStreams(np) {
  const mounts = np?.station?.mounts || np?.station?.streams || [];
  const options = [];

  for (const m of mounts) {
    let url = m?.url || m?.listen_url;

    // ✅ FIX: Convert relative URLs like "/listen/..." into absolute URLs
    if (url && url.startsWith("/")) {
      url = AZURACAST_BASE + url;
    }

    const name = m?.name || m?.path || m?.format || url;
    if (url) options.push({ name, url });
  }

  // Also make fallback absolute if it’s relative
  if (FALLBACK_STREAM_URL) {
    const fb = FALLBACK_STREAM_URL.startsWith("/")
      ? AZURACAST_BASE + FALLBACK_STREAM_URL
      : FALLBACK_STREAM_URL;

    options.push({ name: "Fallback Stream", url: fb });
  }

  if (!options.length) {
    options.push({
      name: "Stream (set FALLBACK_STREAM_URL)",
      url: FALLBACK_STREAM_URL || ""
    });
  }

  streamSelect.innerHTML = "";
  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt.url;
    el.textContent = opt.name;
    streamSelect.appendChild(el);
  }

  if (streamSelect.value) audio.src = streamSelect.value;
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
    if (!streamSelect.options.length) populateStreams(np);
  } catch (e) {
    console.warn(e);
    setText("track", "Metadata not loading yet (check config).");
  }
}

playBtn.addEventListener("click", async () => {
  console.log("Trying to play:", audio.src);
  if (streamSelect.value) audio.src = streamSelect.value;
  try {
    await audio.play();
    console.log("Trying to play:", audio.src);
    playBtn.disabled = true;
  } catch (e) {
    alert("Playback failed. Try another stream format or check the stream URL.");
  }
});

stopBtn.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
  playBtn.disabled = false;
});

streamSelect.addEventListener("change", () => {
  audio.pause();
  audio.src = streamSelect.value;
  playBtn.disabled = false;
});

document.getElementById("year").textContent = new Date().getFullYear();

refresh();
setInterval(refresh, 15000);
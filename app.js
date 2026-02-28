
const AZURACAST_BASE = "http://REMOVED_IP";
const STATION_SHORTCODE = "test_";

const FALLBACK_STREAM_URL = "http://REMOVED_IP/listen/test_/radio.mp3";

// AzuraCast static Now Playing JSON:
// http(s)://host/api/nowplaying_static/<station_shortcode>.json
// Docs: https://www.azuracast.com/docs/developers/now-playing-data/  (see "Static Now Playing JSON File") :contentReference[oaicite:2]{index=2}


const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const stopBtn = document.getElementById("stop");
const livePill = document.getElementById("live");

let liveDjShows = {}

async function loadLiveDjShows() {
  try {
    const res = await fetch("/liveDjs.json", { cache: "no-store" });
    if (res.ok) liveDjShows = await res.json();
    console.log(liveDjShows);
  } catch (e) {
    console.warn("Could not load shows.json", e);
  }
}

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

  const isLive = !!np?.live?.is_live;
  livePill.hidden = !isLive;

  const listeners = np?.listeners?.current;
  setText("listeners", (typeof listeners === "number") ? `Listeners: ${listeners}` : "");

  if(isLive){
    const liveKey = np?.live?.streamer_name || "";
    console.log("streamer name " + liveKey);
    const profile = liveDjShows[liveKey] || {};

    console.log(liveDjShows);
    console.log(profile);
    const djName = np?.live?.streamer_name || "Live DJ";

    const showTitle = profile?.showTitle || "Live Broadcast";

    const showDescription = profile?.description || "";

    const liveArt = np?.live?.art;

    setText("mix", `${djName}${showTitle ? " — " + showTitle : ""}`);
    setText("mix-description", showDescription);
    setArt(liveArt, `${djName} ${showTitle}`.trim());

    return;
  }

  const djMix = np?.now_playing?.song;
  const djName = djMix?.artist;
  const showTitle = djMix?.title;
  const showDescription = djMix?.lyrics;

  setText("mix", [djName, showTitle].filter(Boolean).join(" — ") || np?.now_playing?.text || "—");
  setText("mix-description",showDescription);
  

  

  setArt(djMix?.art || djMix?.art_url, `${djName || ""} ${showTitle || ""}`.trim());
}

async function refresh() {
  try {
    const np = await fetchNowPlaying();
    console.log(np);
    console.log("LIVE fields:", np?.live);
    updateUI(np);
  } catch (e) {
    console.warn(e);
    setText("track", "Metadata not loading yet (check config).");
  }
}

playBtn.addEventListener("click", async () => {
   if (!audio.src) {
    audio.src = FALLBACK_STREAM_URL;
  }
  console.log("Trying to play:", audio.src);

  if(audio.paused){
    try {
        await audio.play();
        
    } catch (e) {
        console.error(e);
        alert("Playback failed. Check the stream URL / format.");
    }
} else{
    audio.pause();
}
});

await loadLiveDjShows();
refresh();
setInterval(refresh, 15000);
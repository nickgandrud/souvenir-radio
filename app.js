
const AZURACAST_BASE = "http://104.236.123.205";
const STATION_SHORTCODE = "test_";

const FALLBACK_STREAM_URL = "http://104.236.123.205/listen/test_/radio.mp3";

// AzuraCast static Now Playing JSON:
// http(s)://host/api/nowplaying_static/<station_shortcode>.json
// Docs: https://www.azuracast.com/docs/developers/now-playing-data/  (see "Static Now Playing JSON File") :contentReference[oaicite:2]{index=2}


const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const stopBtn = document.getElementById("stop");
const livePill = document.getElementById("live");

const volumeFab = document.getElementById("volumeFab");
const volumePanel = document.getElementById("volumePanel");
const volumeSlider = document.getElementById("volumeSlider");
const muteBtn = document.getElementById("muteBtn");

function setVolumeOpen(open) {
  volumeFab.classList.toggle("is-open", open);
  volumePanel.setAttribute("aria-hidden", String(!open));
}

function toggleVolumeOpen() {
  setVolumeOpen(!volumeFab.classList.contains("is-open"));
}

function updateVolumeIcon() {
  const icon = muteBtn.querySelector("i");
  if (!icon) return;

  if (audio.muted || audio.volume === 0) {
    icon.className = "bi bi-volume-mute-fill";
  } else if (audio.volume < 0.5) {
    icon.className = "bi bi-volume-down-fill";
  } else {
    icon.className = "bi bi-volume-up-fill";
  }
}

// Initialize
audio.volume = Number(volumeSlider.value);
updateVolumeIcon();
setVolumeOpen(false);

// Click icon toggles panel open/closed (and also works as "mute" if you want)
muteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleVolumeOpen();
});

// Change volume
volumeSlider.addEventListener("input", () => {
  const v = Number(volumeSlider.value);
  audio.volume = v;
  if (v > 0) audio.muted = false;
  updateVolumeIcon();
});

// Click outside closes it
document.addEventListener("click", (e) => {
  if (!volumeFab.contains(e.target)) setVolumeOpen(false);
});

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

    // setText("mix", `${djName}${showTitle ? " — " + showTitle : ""}`);
    setText("mix", `${showTitle}${djName ? " with " + djName :""}`);
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

function setPlayIcon(isPlaying) {
  const icon = playBtn.querySelector("i");
  if (!icon) return;
  icon.className = isPlaying ? "bi bi-pause-fill fs-4" : "bi bi-play-fill fs-4";
}

playBtn.addEventListener("click", async () => {
  if (!audio.src) audio.src = FALLBACK_STREAM_URL;

  if (audio.paused) {
    try {
      await audio.play();
      setPlayIcon(true);
    } catch (e) {
      console.error(e);
      alert("Playback failed. Check the stream URL / format.");
    }
  } else {
    audio.pause();
    setPlayIcon(false);
  }
});

async function loadSchedule() {
  try {
    const res = await fetch("souvenir-schedule.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Schedule fetch failed: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn("Could not load souvenir-schedule.json", e);
    return [];
  }
}

function formatScheduleDate(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const datePart = start.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  const startPart = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const endPart = end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return `${datePart} • ${startPart} - ${endPart}`;
}

function renderUpcomingBroadcasts(shows) {
  const container = document.getElementById("upcoming-broadcasts-list");
  if (!container) return;

  const now = new Date();

  const upcomingShows = shows
    .filter((show) => {
      const start = new Date(show.start_time);
      return !Number.isNaN(start.getTime()) && start > now;
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 3);

  if (!upcomingShows.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="card bg-card border shadow-sm">
          <div class="card-body text-center">
            <p class="mb-0">No upcoming live broadcasts scheduled.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = upcomingShows
    .map((show) => {
      const title = show.title || "Upcoming Broadcast";
      const host = show.host || "";
      const description = show.description || "";
      const imageUrl = show.image_url || "";
      const dateText = formatScheduleDate(show.start_time, show.end_time);

      return `
        <div class="col-12 col-md-4">
          <div class="card bg-card border shadow-sm h-100">
            ${imageUrl ? `<img src="${imageUrl}" class="card-img-top" alt="${title}">` : ""}
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div class="fw-bold">${title}${host ? ` with ${host}` : ""}</div>
                <span class="badge text-bg-secondary">SCHEDULED</span>
              </div>

              <div class="mt-3 small text-muted">
                ${dateText}
              </div>

              <p class="mt-3 mb-0 mix-description">
                ${description}
              </p>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function initSchedule() {
  const shows = await loadSchedule();
  
  renderUpcomingBroadcasts(shows);
}

// Keep icon in sync if playback changes
audio.addEventListener("play", () => setPlayIcon(true));
audio.addEventListener("pause", () => setPlayIcon(false));

await loadLiveDjShows();
await initSchedule();
refresh();
setInterval(refresh, 15000);
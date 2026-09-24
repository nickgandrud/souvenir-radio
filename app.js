const AZURACAST_BASE = import.meta.env.VITE_AZURACAST_BASE;
const STATION_SHORTCODE = import.meta.env.VITE_STATION_SHORTCODE;
const FALLBACK_STREAM_URL = import.meta.env.VITE_STREAM_URL;

const audio = document.getElementById("audio");
const artWrap = document.getElementById("artWrap");
const artOverlayIcon = document.getElementById("artOverlayIcon");
const livePill = document.getElementById("live");

const volumeFab = document.getElementById("volumeFab");
const volumePanel = document.getElementById("volumePanel");
const volumeSlider = document.getElementById("volumeSlider");
const muteBtn = document.getElementById("muteBtn");
const mixToggle = document.getElementById("mix-toggle");
const mixDescription = document.getElementById("mix-description");

function setVolumeOpen(open) {
  volumeFab.classList.toggle("is-open", open);
  volumePanel.setAttribute("aria-hidden", String(!open));
}

function setMixDescriptionExpanded(expanded) {
  mixToggle.setAttribute("aria-expanded", String(expanded));
  mixDescription.hidden = !expanded;
}

setMixDescriptionExpanded(true);

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

// Click icon toggles panel open/closed
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

let liveDjShows = {};

async function loadLiveDjShows() {
  try {
    const res = await fetch("/liveDjs.json", { cache: "no-store" });
    if (res.ok) liveDjShows = await res.json();

  } catch (e) {
    console.warn("Could not load liveDjs.json", e);
  }
}

function setText(id, text) {
  const element = document.getElementById(id);

  if(!element){
    console.warn(`Element #${id} not found`);
    return;
  }
  element.textContent = text || "";
}

function setArt(url, alt) {
  const art = document.getElementById("art");

  if (!url) {
    art.removeAttribute("src");
    art.alt = "";
    art.style.display = "none";
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `${AZURACAST_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  art.style.display = "";
  art.src = url;
  art.alt = alt || "Album art";
}

async function fetchNowPlaying() {
  const url = `${AZURACAST_BASE}/api/nowplaying_static/${STATION_SHORTCODE}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`NowPlaying fetch failed: ${res.status}`);

  return res.json();
}

function updateUI(np) {
  const isLive = !!np?.live?.is_live;
  livePill.hidden = !isLive;

  if (isLive) {
    const liveKey = np?.live?.streamer_name || "";

    const profile = liveDjShows[liveKey] || {};


    const djName = np?.live?.streamer_name || "Live DJ";
    const showTitle = profile?.showTitle || "Live Broadcast";
    const showDescription = profile?.description || "";
    const liveArt = np?.live?.art;

    setText("mix", `${showTitle}${djName ? " with " + djName : ""}`);
    setText("mix-description", showDescription);
    setArt(liveArt, `${djName} ${showTitle}`.trim());

    return;
  }

  const djMix = np?.now_playing?.song;
  const djName = djMix?.artist;
  const showTitle = djMix?.title;
  const showDescription = djMix?.lyrics;

  setText("mix", [djName, showTitle].filter(Boolean).join(" — ") || np?.now_playing?.text || "—");
  setText("mix-description", showDescription);
  setArt(djMix?.art || djMix?.art_url, `${djName || ""} ${showTitle || ""}`.trim());
}

async function refresh() {
  try {
    const np = await fetchNowPlaying();
    updateUI(np);
  } catch (e) {
    console.warn("Unable to load now-playing metadata:", e);
    setText("mix", "Unable to load station metadata.");
    setText("mix-description", "Please try again later.");
  }
}

function setPlayIcon(isPlaying) {
  if (!artOverlayIcon) return;
  artOverlayIcon.className = isPlaying ? "bi bi-pause-fill" : "bi bi-play-fill";
}

async function togglePlayback() {
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
}

artWrap.addEventListener("click", async () => {
  await togglePlayback();
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

function escapeICS(text = "") {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatICSDate(dateString) {
  const date = new Date(dateString);

  const pad = (num) => String(num).padStart(2, "0");

  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function downloadCalendarEvent(show) {
  const title = show.title || "Upcoming Broadcast";
  const host = show.host ? ` with ${show.host}` : "";
  const description = show.description || "";
  const location = show.location || "souvenir radio";
  const start = formatICSDate(show.start_time);
  const end = formatICSDate(show.end_time);

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@souvenir.fm`;
  const stamp = formatICSDate(new Date().toISOString());

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//souvenir.fm//Upcoming Shows//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(title + host)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(title)}.ics`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    .map((show, index) => {
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
              <div class="text-center">
                <div class="fw-bold">${title}${host ? ` with ${host}` : ""}</div>
               
              </div>

              <div class=" text-center mt-3 small text-muted">
                ${dateText}
                ${description}
              </div>
              <p class="mt-3 mb-0 mix-description">
                ${description}
              </p>

              <button
                class="btn btn-dark btn-sm mt-3 add-calendar-btn"
                type="button"
                data-show-index="${index}"
              >
                Add to Calendar
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const calendarButtons = container.querySelectorAll(".add-calendar-btn");

  calendarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.showIndex);
      const show = upcomingShows[index];
      if (show) downloadCalendarEvent(show);
    });
  });
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
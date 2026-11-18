// ============ MALHAE DAILY LOCATION: the phone's GPS tells the daily emails where you are ============
// The phone's position, rounded to a tenth of a degree (about 11 km, city level) and named with BigDataCloud's
// free lookup, is saved in the MALHAE_LOCATION repository variable that the email workflow reads.
// Runs on daily.html (set-up, "Update now" and the ?sync link for MacroDroid) and quietly on the phrasebook.
(() => {
  "use strict";

  const KEY = "malhaeDaily";
  const VARIABLE = "MALHAE_LOCATION";
  // The repository behind this GitHub Pages site: jsalvarado.github.io/malhae → JSAlvarado/malhae
  const OWNER = location.hostname.endsWith(".github.io") ? location.hostname.split(".")[0] : "JSAlvarado";
  const REPO = location.hostname.endsWith(".github.io") ? (location.pathname.split("/")[1] || "malhae") : "malhae";
  const API = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/actions/variables";
  const QUIET_EVERY = 30 * 60 * 1000;     // open the app twice in a few minutes: one update
  const SAME_PLACE_FOR = 6 * 3600 * 1000; // same rounded place: refresh only every few hours

  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } };
  const settings = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* not saved: private browsing */ } };

  function position() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("This browser can't share its location."));
      navigator.geolocation.getCurrentPosition(resolve, (err) => reject(new Error(
        err.code === 1 ? "Location is turned off for Malhae. Allow it in Chrome: tap the icon left of the address, then Permissions." : "Couldn't find your location. Turn on Location (GPS) and try again."
      )), { enableHighAccuracy: false, timeout: 20000, maximumAge: 10 * 60 * 1000 });
    });
  }

  // A town name for the email; the coordinates still work if the lookup fails
  async function placeName(lat, lon) {
    try {
      const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en&latitude=" + lat + "&longitude=" + lon);
      const d = await res.json();
      const town = d.city || d.locality || d.principalSubdivision;
      if (!town) return "";
      return d.countryCode === "KR" || !d.countryName ? town : town + ", " + d.countryName;
    } catch (e) {
      return "";
    }
  }

  async function github(method, path, body) {
    return fetch(API + path, {
      method,
      headers: { Authorization: "Bearer " + settings.token, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  // Writes the repository variable, creating it the first time
  async function saveVariable(value) {
    let res = await github("PATCH", "/" + VARIABLE, { name: VARIABLE, value });
    if (res.status === 404) res = await github("POST", "", { name: VARIABLE, value });
    if (res.status === 401) throw new Error("GitHub didn't accept the token. Make a new one and save it again.");
    if (res.status === 403 || res.status === 404) throw new Error("The token can't change variables. Give it access to the " + REPO + " repository with Variables: Read and write.");
    if (!res.ok) throw new Error("GitHub said " + res.status + ". Try again in a minute.");
  }

  async function update(quiet) {
    if (!settings.token) throw new Error("Save a GitHub token first (set-up below).");
    const pos = await position();
    const lat = Math.round(pos.coords.latitude * 10) / 10;
    const lon = Math.round(pos.coords.longitude * 10) / 10;
    const last = settings.last;
    if (quiet && last && last.latitude === lat && last.longitude === lon && Date.now() - Date.parse(last.updated) < SAME_PLACE_FOR) return last;
    const name = (await placeName(lat, lon)).replace(/[()]/g, "");
    await saveVariable((name ? name + " " : "") + "(" + lat + ", " + lon + ")");
    settings.last = { name: name || "your location", latitude: lat, longitude: lon, updated: new Date().toISOString() };
    save();
    return settings.last;
  }

  // ---- On the phrasebook: a quiet update when the app opens, only if location is already allowed ----
  if (!document.getElementById("update")) {
    const due = !settings.tried || Date.now() - settings.tried > QUIET_EVERY;
    if (settings.auto !== false && settings.token && due && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((p) => {
        if (p.state !== "granted") return;
        settings.tried = Date.now();
        save();
        update(true).catch(() => { /* tried again next time the app opens */ });
      }).catch(() => { /* this browser can't tell; daily.html still works */ });
    }
    return;
  }

  // ---- On daily.html ----
  const $ = (id) => document.getElementById(id);
  const syncLink = location.origin + location.pathname + "?sync";
  function render() {
    const last = settings.last;
    $("where").textContent = last ? last.name : "Not set yet (the emails use Seoul)";
    $("when").textContent = last ? "Sent from this phone " + new Date(last.updated).toLocaleString() : "";
    $("token").placeholder = settings.token ? "Token saved on this phone" : "github_pat_…";
    $("auto").checked = settings.auto !== false;
    $("sync-link").textContent = syncLink;
  }
  const status = (text) => { $("status").textContent = text; };

  async function runUpdate() {
    $("update").disabled = true;
    status("Finding your location…");
    try {
      const place = await update(false);
      status("Saved. The next email will use " + place.name + ".");
    } catch (e) {
      status(e.message);
    }
    $("update").disabled = false;
    render();
  }

  $("update").addEventListener("click", runUpdate);
  $("token-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const token = $("token").value.trim();
    if (!token) return;
    settings.token = token;
    save();
    $("token").value = "";
    render();
    runUpdate();
  });
  $("copy").addEventListener("click", () => {
    navigator.clipboard.writeText(syncLink).then(() => status("Link copied."), () => status("Select the link and copy it."));
  });
  $("auto").addEventListener("change", () => { settings.auto = $("auto").checked; save(); });
  $("forget").addEventListener("click", () => {
    delete settings.token;
    save();
    status("The token is gone from this phone. The emails keep the last location.");
    render();
  });
  render();
  // Opened by MacroDroid (or a bookmark) as daily.html?sync: update straight away
  if (new URLSearchParams(location.search).has("sync") && settings.token) runUpdate();
})();

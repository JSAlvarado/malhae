// ============ MALHAE DAILY LOCATION: the phone tells the daily emails where you are ============
// The phone's position, rounded to about 1 km, is saved in a secret gist on your GitHub account. The email
// workflow reads that gist (its ID is a repository secret), so the place never appears in the public repository
// or its logs. Runs on daily.html (set-up and "Update now") and quietly on the phrasebook when you open it.
(() => {
  "use strict";

  const KEY = "malhaeDaily";
  const FILE = "malhae-location.json";
  const API = "https://api.github.com";
  const QUIET_EVERY = 30 * 60 * 1000;     // open the app twice in a few minutes: one update
  const SAME_PLACE_FOR = 6 * 3600 * 1000; // same rounded place: refresh the gist only every few hours

  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } };
  const settings = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* not saved: private browsing */ } };

  function position() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("This browser can't share its location."));
      navigator.geolocation.getCurrentPosition(resolve, (err) => reject(new Error(
        err.code === 1 ? "Location is turned off for Malhae. Allow it in the browser's settings." : "Couldn't find your location. Try again outside or with Wi-Fi on."
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
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: "Bearer " + settings.token, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.status === 401) throw new Error("GitHub didn't accept the token. Check it and save it again.");
    if (res.status === 403 || res.status === 404) throw new Error("The token can't write gists. Give it Gists: Read and write.");
    if (!res.ok) throw new Error("GitHub said " + res.status + ". Try again in a minute.");
    return res.json();
  }

  // Rounds to two decimals (about 1 km), saves to the gist, creating it the first time
  async function update(quiet) {
    if (!settings.token) throw new Error("Save a GitHub token first (set-up below).");
    const pos = await position();
    const lat = Math.round(pos.coords.latitude * 100) / 100;
    const lon = Math.round(pos.coords.longitude * 100) / 100;
    const last = settings.last;
    if (quiet && last && last.latitude === lat && last.longitude === lon && Date.now() - Date.parse(last.updated) < SAME_PLACE_FOR) return last;
    const place = { name: (await placeName(lat, lon)) || "your location", latitude: lat, longitude: lon, updated: new Date().toISOString() };
    const files = { [FILE]: { content: JSON.stringify(place, null, 2) } };
    if (settings.gistId) {
      await github("PATCH", "/gists/" + encodeURIComponent(settings.gistId), { files });
    } else {
      const gist = await github("POST", "/gists", { description: "Malhae Daily location (used by the daily email workflow)", public: false, files });
      settings.gistId = gist.id;
    }
    settings.last = place;
    save();
    return place;
  }

  // ---- On the phrasebook: a quiet update when the app opens, only if location is already allowed ----
  const page = document.getElementById("update");
  if (!page) {
    const due = !settings.tried || Date.now() - settings.tried > QUIET_EVERY;
    if (settings.auto && settings.token && settings.gistId && due && navigator.permissions) {
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
  function render() {
    const last = settings.last;
    $("where").textContent = last ? last.name + " (" + last.latitude + ", " + last.longitude + ")" : "Not set yet (the emails use Seoul)";
    $("when").textContent = last ? "Sent from this phone " + new Date(last.updated).toLocaleString() : "";
    $("gist-row").hidden = !settings.gistId;
    $("gist-id").textContent = settings.gistId || "";
    $("token").placeholder = settings.token ? "Token saved on this phone" : "github_pat_…";
    $("auto").checked = settings.auto !== false;
  }
  const status = (text) => { $("status").textContent = text; };

  $("update").addEventListener("click", async () => {
    $("update").disabled = true;
    status("Finding your location…");
    const first = !settings.gistId;
    try {
      const place = await update(false);
      status("Saved. The next email will use " + place.name + "." + (first ? " Now add the gist ID below as the MALHAE_LOCATION_GIST repository secret (step 4)." : ""));
    } catch (e) {
      status(e.message);
    }
    $("update").disabled = false;
    render();
  });
  $("token-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const token = $("token").value.trim();
    if (!token) return;
    settings.token = token;
    if (settings.auto === undefined) settings.auto = true;
    save();
    $("token").value = "";
    status("Token saved on this phone.");
    render();
  });
  $("copy").addEventListener("click", () => {
    navigator.clipboard.writeText(settings.gistId).then(() => status("Gist ID copied."), () => status("Select the ID and copy it."));
  });
  $("auto").addEventListener("change", () => { settings.auto = $("auto").checked; save(); });
  $("forget").addEventListener("click", () => {
    delete settings.token;
    save();
    status("The token is gone from this phone. The gist keeps the last location.");
    render();
  });
  render();
})();

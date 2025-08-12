/*
  script.js
  Read-only Firestore integration + original site code (complete).
  - This file will try to use an existing firebase config on the page:
      window.firebaseConfig  OR  window.__FIREBASE_CONFIG__
    If no config is found, Firestore features will be disabled but the original hard-coded table remains as fallback.
  - No seeding functions are included.
  - Keeps original map, clock, filter, and routing code intact.
*/

/* -------------------- FIREBASE (modular v9) -------------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let app = null;
let db = null;

// Try to auto-detect firebaseConfig on the page so you don't have to edit this file.
// If you previously embedded your firebaseConfig in another script as `window.firebaseConfig`,
// this code will reuse it.
const detectedConfig = window.firebaseConfig || window.__FIREBASE_CONFIG__ || null;

if (detectedConfig) {
  try {
    app = initializeApp(detectedConfig);
    // prefer initializeFirestore with useFetchStreams:false to avoid WebChannel streaming issues on some networks
    try {
      db = initializeFirestore(app, { useFetchStreams: false });
    } catch (e) {
      // fallback
      db = getFirestore(app);
    }
    console.log('Firebase initialized from detected config. Firestore ready.');
  } catch (err) {
    console.warn('Error initializing Firebase with detected config:', err);
    app = null;
    db = null;
  }
} else {
  console.warn('No firebaseConfig detected on window (window.firebaseConfig or window.__FIREBASE_CONFIG__). Firestore features are disabled.');
}

// Firestore doc we will use (only if db exists)
let scheduleDocRef = null;
if (db) {
  scheduleDocRef = doc(db, 'schedules', 'pretoria-saulsville');
}

/* -------------------- Render schedule from Firestore -------------------- */
function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderSchedule(data) {
  const table = document.getElementById('schedule-table');
  if (!table) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  // Build header row (first cell is Train No.)
  const headerCells = ['<th>Train No.</th>'].concat(
    (data.trainNumbers || []).map(n => `<th>${escapeHtml(n)}</th>`)
  ).join('');
  thead.innerHTML = `<tr>${headerCells}</tr>`;

  // Build body rows
  tbody.innerHTML = (data.rows || []).map(row => {
    const times = row.times || [];
    const cells = ['<td>' + escapeHtml(row.station || '') + '</td>']
      .concat(times.map(t => `<td>${escapeHtml(t || '')}</td>`));
    return `<tr>${cells.join('')}</tr>`;
  }).join('');
}

/* -------------------- Load and listen for Firestore changes (if available) -------------------- */
async function loadScheduleFromFirestore() {
  if (!db || !scheduleDocRef) return;
  try {
    const snap = await getDoc(scheduleDocRef);
    if (snap.exists()) {
      renderSchedule(snap.data());
      console.log('Schedule loaded from Firestore');
    } else {
      console.warn('No schedule document found in Firestore at schedules/pretoria-saulsville');
    }
  } catch (err) {
    console.error('Error loading schedule from Firestore:', err);
  }
}

function listenForScheduleChanges() {
  if (!db || !scheduleDocRef) return;
  onSnapshot(scheduleDocRef, (snap) => {
    if (snap.exists()) {
      renderSchedule(snap.data());
      console.log('Realtime update applied to schedule table');
    }
  }, (err) => {
    console.error('Realtime listener error:', err);
  });
}

/* -------------------- ORIGINAL SITE CODE (routing, filters, map, clock, etc.) -------------------- */

/* ROUTING & PAGES */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
  } else {
    document.getElementById('home').classList.add('active');
  }
}

window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '') || 'home';
  showPage(hash);
});

/* FILTER / SEARCH */
function filterRows() {
  const query = document.getElementById("search")?.value.toLowerCase() || "";
  const rows = document.querySelectorAll("#schedule-table tbody tr");

  rows.forEach(row => {
    const station = row.cells[0].textContent.toLowerCase();
    row.style.display = station.includes(query) ? "" : "none";
  });
}

/* ABOUT PAGE DATA */
const teamMembers = [
    { name: "Frank Nkuna", position: "CEO", image: "images/image.jpg" },
    { name: "Oageng Mashaba", position: "Operations Director", image: "images/oagang.jpg" },
    { name: "Kagiso M", position: "Safety Manager", image: "images/kg.jpg" },
    { name: "Tshepo Sepataka", position: "Customer Service", image: "images/image.jpg" }
];

function initAboutPage() {
    function updateDateTime() {
        const now = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
        const el = document.getElementById('currentDateTime');
        if (el) el.textContent = now.toLocaleDateString('en-US', options);
        const y = document.getElementById('currentYear');
        if (y) y.textContent = now.getFullYear();
    }

    function renderTeam() {
        const teamContainer = document.getElementById('teamMembers');
        if (!teamContainer) return;
        teamContainer.innerHTML = teamMembers.map(member => `
            <div class="team-member">
                <img src="${member.image}" alt="${member.name}">
                <h3>${member.name}</h3>
                <p>${member.position}</p>
            </div>
        `).join('');
    }

    updateDateTime();
    renderTeam();
    setInterval(updateDateTime, 6000);
}

/* MAP, ROUTES, SCHEDULE COUNTDOWN */
const trainSchedule = ["06:00", "07:30", "09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30", "21:00", "23:45"];

const routes = [
    { origin: "Saulsville", destination: "Pretoria", price: "R5,50", originCoords: [-25.77000000, 28.054444], destCoords: [-25.7548, 28.1868] },
    { origin: "Pretoria", destination: "De Wildt", price: "R7,20", originCoords: [-25.7548, 28.1868], destCoords: [-25.61248, 27.91062] },
    { origin: "Pretoria", destination: "Saulsville", price: "R5,50", originCoords: [-25.7548, 28.1868], destCoords: [-25.77000000, 28.054444] },
    { origin: "De Wildt", destination: "Pretoria", price: "R6,80", originCoords: [-25.61248, 27.91062], destCoords: [-25.7548, 28.1868] }
];

let currentRouteIndex = 0;
let map;
let originMarker, destMarker;
let routeLine;

function initMap() {
    // Ensure Leaflet CSS/JS are loaded in the page (your home.html had them previously)
    if (typeof L === 'undefined') {
      console.warn('Leaflet (L) is not loaded. Map functions will be disabled.');
      return;
    }
    map = L.map('map').setView([-25.7479, 28.2293], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    updateMapRoute();
}

function updateMapRoute() {
    const route = routes[currentRouteIndex];
    if (originMarker) map.removeLayer(originMarker);
    if (destMarker) map.removeLayer(destMarker);
    if (routeLine) map.removeLayer(routeLine);

    originMarker = L.marker(route.originCoords).addTo(map).bindPopup(`Origin: ${route.origin}`);
    destMarker = L.marker(route.destCoords).addTo(map).bindPopup(`Destination: ${route.destination}`);
    const lineColor = route.destination === "Pretoria" ? '#2ecc71': '#3498db';
    routeLine = L.polyline([route.originCoords, route.destCoords], { color: lineColor, weight: 3 }).addTo(map);
    map.fitBounds([route.originCoords, route.destCoords]);
}

function updateRoute() {
    currentRouteIndex = (currentRouteIndex + 1) % routes.length;
    const route = routes[currentRouteIndex];
    const originEl = document.getElementById('origin');
    const destinationEl = document.getElementById('destination');
    const tripCostEl = document.getElementById('tripCost');
    if (originEl) originEl.textContent = route.origin;
    if (destinationEl) destinationEl.textContent = route.destination;
    if (tripCostEl) tripCostEl.textContent = route.price;
    updateMapRoute();
}

function updateClock() {
    const now = new Date();
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const compactTimeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    const currentDate = now.toLocaleDateString('en-US', dateOptions);
    let currentTime = now.toLocaleTimeString('en-US', timeOptions);
    let compactTime = now.toLocaleTimeString('en-US', compactTimeOptions);
    currentTime = currentTime.replace(/^24:/, '00:');
    compactTime = compactTime.replace(/^24:/, '00:');

    const cdt = document.getElementById('currentDateTime');
    if (cdt) cdt.textContent = `${currentDate}\n${currentTime}`;
    const cdtCompact = document.getElementById('currentDateTimeCompact');
    if (cdtCompact) cdtCompact.textContent = `${currentDate}, ${compactTime}`;
    const cy = document.getElementById('currentYear');
    if (cy) cy.textContent = now.getFullYear();
}

function updateTrainCountdown() {
    const now = new Date();
    const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let nextTrain = null;
    let secDiff = Infinity;

    for (const time of trainSchedule) {
        const [trainHours, trainMinutes] = time.split(':').map(Number);
        const trainTotalSeconds = trainHours * 3600 + trainMinutes * 60;
        let diff = trainTotalSeconds - currentTotalSeconds;
        if (diff > 0 && diff < secDiff) {
            secDiff = diff;
            nextTrain = time;
        }
    }

    const countdownElement = document.getElementById('countdown');

    if (nextTrain) {
        const hours = Math.floor(secDiff / 3600)
        const minutes = Math.floor((secDiff%3600) / 60);
        const seconds = secDiff % 60;

        if (secDiff <= 60) {
            if (countdownElement) countdownElement.textContent = `${seconds} seconds - Boarding now!`;
        } else if (secDiff <= 120) {
            if (countdownElement) countdownElement.textContent = "1 minute - Boarding soon!";
        } else if(secDiff >= 3600){
            if (countdownElement) countdownElement.textContent = `${hours} hours ${minutes} minutes (${nextTrain})`
        } else {
            const [hoursStr, mins] = nextTrain.split(':');
            const formattedTime = `${hoursStr.padStart(2, '0')}:${mins}`;
            if (countdownElement) countdownElement.textContent = `${minutes} minutes (${formattedTime})`;
        }
    } else {
        const firstTrain = trainSchedule[0].split(':').map(Number);
        const firstTrainSeconds = firstTrain[0] * 3600 + firstTrain[1] * 60;
        const secondsUntilFirstTrain = (24 * 3600 - currentTotalSeconds) + firstTrainSeconds;

        if (secondsUntilFirstTrain < 12 * 3600) {
            const hours = Math.floor(secondsUntilFirstTrain / 3600);
            const minutes = Math.floor((secondsUntilFirstTrain % 3600) / 60);
            const formattedTime = `${firstTrain[0].toString().padStart(2, '0')}:${firstTrain[1].toString().padStart(2, '0')}`;
            if (countdownElement) countdownElement.textContent = `${hours}h ${minutes}m (${formattedTime} next day)`;
        } else {
            if (countdownElement) countdownElement.textContent = "No more trains today";
        }
    }
}

function updateAll() {
    updateClock();
    updateTrainCountdown();
}

/* INIT */
function init() {
  initMap();
  updateAll();
  updateRoute();

  // Firestore: load and listen only if db is initialized
  if (db && scheduleDocRef) {
    loadScheduleFromFirestore();     // loads once from Firestore
    listenForScheduleChanges();      // realtime updates
  } else {
    console.log('Firestore not initialized — using hard-coded schedule fallback.');
  }

  setInterval(updateAll, 1000);
  setInterval(updateRoute, 15000);

  // About page init
  initAboutPage();

  // wire optional search input (if present)
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', filterRows);
  }
}

document.addEventListener('DOMContentLoaded', init);

/* End of script.js */




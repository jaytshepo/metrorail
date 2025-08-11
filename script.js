/* script.js - replaced with Firestore integration
   Make sure home.html now loads this file as: <script type="module" src="script.js"></script>
*/

/* -------------------- FIREBASE (modular v9) -------------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// 1) Paste your firebaseConfig here (from Firebase console)
const firebaseConfig = {
    apiKey: "AIzaSyB2gjql42QQAn6kEnuAlb-U8uO4veOf9kQ",
    authDomain: "metro-rail-2de9c.firebaseapp.com",
    projectId: "metro-rail-2de9c",
    storageBucket: "metro-rail-2de9c.firebasestorage.app",
    messagingSenderId: "1036516254492",
    appId: "1:1036516254492:web:a1d07b16233af9cecc90d9",
    measurementId: "G-83G44S49J5"
};

// 2) Initialize Firebase + Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore doc we will use:
const scheduleDocRef = doc(db, 'schedules', 'pretoria-saulsville');

/* -------------------- Helper: render schedule into table -------------------- */
function renderSchedule(data) {
  // data expected shape:
  // { trainNumbers: ["0003","0005",...],
  //   rows: [ { station: "PRETORIA", times: ["05:15","05:29",...] }, ... ] }

  const table = document.getElementById('schedule-table');
  if (!table) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  // Build header: first cell "Train No." then train numbers
  const headerCells = ['<th>Train No.</th>'].concat(
    (data.trainNumbers || []).map(n => `<th>${n}</th>`)
  ).join('');
  thead.innerHTML = `<tr>${headerCells}</tr>`;

  // Build body rows
  tbody.innerHTML = (data.rows || []).map(row => {
    // make sure times length matches trainNumbers length (pad with empty)
    const times = (row.times || []);
    const cells = ['<td>' + escapeHtml(row.station || '') + '</td>']
      .concat(times.map(t => `<td>${escapeHtml(t || '')}</td>`));
    return `<tr>${cells.join('')}</tr>`;
  }).join('');
}

// small helper to avoid HTML injection if any (good practice)
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* -------------------- Load schedule once -------------------- */
async function loadScheduleFromFirestore() {
  try {
    const snap = await getDoc(scheduleDocRef);
    if (snap.exists()) {
      renderSchedule(snap.data());
      console.log('Schedule loaded from Firestore');
    } else {
      console.log('No schedule doc found in Firestore at schedules/pretoria-saulsville');
    }
  } catch (err) {
    console.error('Error loading schedule:', err);
  }
}

/* -------------------- Realtime listener -------------------- */
function listenForScheduleChanges() {
  onSnapshot(scheduleDocRef, (snap) => {
    if (snap.exists()) {
      renderSchedule(snap.data());
      console.log('Realtime update applied to table');
    } else {
      console.log('Schedule doc removed or does not exist.');
    }
  }, (err) => {
    console.error('Realtime listener error:', err);
  });
}

/* -------------------- Seed helper (one-time) --------------------
   Reads the current table in the DOM and writes it to Firestore
   Useful to migrate your existing HTML table into Firestore.
   Usage (after page loads): call window.seedSchedule() from devtools console.
*/
function readTableDomToObject() {
  const table = document.getElementById('schedule-table');
  if (!table) return null;

  const ths = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
  // first header is "Train No." - remove it
  const trainNumbers = ths.slice(1);

  const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
    return {
      station: cells[0] || '',
      times: cells.slice(1) // array of times in same order as trainNumbers
    };
  });

  return { trainNumbers, rows };
}

async function seedScheduleToFirestore() {
  const data = readTableDomToObject();
  if (!data) {
    alert('Could not read table DOM.');
    return;
  }
  try {
    await setDoc(scheduleDocRef, data);
    alert('Seeded schedule into Firestore successfully!');
  } catch (err) {
    console.error('Error seeding schedule:', err);
    alert('Error seeding schedule: see console');
  }
}
// expose seed function to console so you can run one-time
window.seedSchedule = seedScheduleToFirestore;

/* -------------------- ------- (your original app code) ------- -------------------- */

/* Keep the rest of your existing script functionality:
   - page routing (showPage)
   - filterRows (search)
   - about page code
   - map & route updates
   - clock & countdown
   These were present in your original file; include them below so the app behaves the same.
   (I paste them unchanged, but you already had them in your file — keep them.)
*/

// --- ROUTING (keep existing showPage/hash code) ---
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

window.addEventListener('load', () => {
  const hash = location.hash.replace('#', '') || 'home';
  showPage(hash);
});

// --- Schedule filter ---
function filterRows() {
  const query = document.getElementById("search")?.value.toLowerCase() || "";
  const rows = document.querySelectorAll("#schedule-table tbody tr");

  rows.forEach(row => {
    const station = row.cells[0].textContent.toLowerCase();
    row.style.display = station.includes(query) ? "" : "none";
  });
}

// --- about page data (unchanged) ---
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

document.addEventListener('DOMContentLoaded', initAboutPage);

// --- route map and schedule helpers (your code) ---
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
    document.getElementById('origin').textContent = route.origin;
    document.getElementById('destination').textContent = route.destination;
    document.getElementById('tripCost').textContent = route.price;
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
            countdownElement.textContent = `${seconds} seconds - Boarding now!`;
        } else if (secDiff <= 120) {
            countdownElement.textContent = "1 minute - Boarding soon!";
        } else if(secDiff >= 3600){
            countdownElement.textContent = `${hours} hours ${minutes} minutes (${nextTrain})`
        } else {
            const [hours, mins] = nextTrain.split(':');
            const formattedTime = `${hours.padStart(2, '0')}:${mins}`;
            countdownElement.textContent = `${minutes} minutes (${formattedTime})`;
        }
    } else {
        const firstTrain = trainSchedule[0].split(':').map(Number);
        const firstTrainSeconds = firstTrain[0] * 3600 + firstTrain[1] * 60;
        const secondsUntilFirstTrain = (24 * 3600 - currentTotalSeconds) + firstTrainSeconds;

        if (secondsUntilFirstTrain < 12 * 3600) {
            const hours = Math.floor(secondsUntilFirstTrain / 3600);
            const minutes = Math.floor((secondsUntilFirstTrain % 3600) / 60);
            const formattedTime = `${firstTrain[0].toString().padStart(2, '0')}:${firstTrain[1].toString().padStart(2, '0')}`;
            countdownElement.textContent = `${hours}h ${minutes}m (${formattedTime} next day)`;
        } else {
            countdownElement.textContent = "No more trains today";
        }
    }
}

function updateAll() {
    updateClock();
    updateTrainCountdown();
}

function init() {
    initMap();
    updateAll();
    updateRoute();

    // Firestore: load and listen
    loadScheduleFromFirestore();     // loads once
    listenForScheduleChanges();      // realtime updates

    setInterval(updateAll, 1000);
    setInterval(updateRoute, 15000);
}

document.addEventListener('DOMContentLoaded', init);

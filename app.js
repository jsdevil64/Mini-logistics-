import {db} from './firebase.js';
import {collection,onSnapshot,query,where} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const box=document.querySelector('#vehicles');
let map;
let userMarker;
const vehicleMarkers=new Map();
let latestSnapshot=null;
let customerLocation=null;
let customerLocationAccuracy=null;

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}


function distanceKm(lat1,lon1,lat2,lon2){
  const R=6371;
  const toRad=v=>v*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function initMap(){
  const status=document.querySelector('#mapStatus');
  map=L.map('map',{zoomControl:true}).setView([10.0,77.0],8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  status.textContent='Map ready';
  status.className='map-status ready';
  if(latestSnapshot) render(latestSnapshot);
}

function render(snap){
  latestSnapshot=snap;
  box.innerHTML='';
  const seen=new Set();
  const bounds=[];

  // First collect all active providers and calculate their distance.
  // Then sort nearest -> farthest before rendering the cards.
  const providers=[];

  snap.forEach(d=>{
    const x=d.data();
    if(String(x.status||'').toLowerCase()!=='active') return;
    // Provider's temporary Stop is separate from the admin-controlled status.
    // Only hide the provider from customers while locationSharing is false.
    if(x.locationSharing === false) return;

    const lat=Number(x.latitude), lng=Number(x.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return;

    const distance=customerLocation
      ? distanceKm(customerLocation.latitude,customerLocation.longitude,lat,lng)
      : Infinity;

    providers.push({id:d.id,data:x,lat,lng,distance});
  });

  // Nearest provider first, farthest provider last.
  providers.sort((a,b)=>a.distance-b.distance);

  providers.forEach(provider=>{
    const {id,data:x,lat,lng,distance}=provider;

    seen.add(id);
    bounds.push([lat,lng]);

    const phone=String(x.whatsapp||x.phone||'').replace(/\D/g,'');
    const wa=phone ? `<a class="whatsapp" target="_blank" rel="noopener" href="https://wa.me/${phone}">💬 WhatsApp</a>` : '';
    const distanceText=customerLocation
      ? `<p class="distance">📏 ${distance.toFixed(1)} km away</p>`
      : `<p class="distance muted">📏 Use my location to see distance</p>`;

    box.innerHTML+=`<article class="card"><span class="pill">ACTIVE</span><h3>${escapeHtml(x.vehicleNumber||'Vehicle')}</h3><p>${escapeHtml(x.name||'Provider')}</p>${distanceText}<p>📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</p>${wa}</article>`;

    if(!map) return;
    const popup=`<div style="min-width:180px"><strong>${escapeHtml(x.vehicleNumber||'Vehicle')}</strong><br>${escapeHtml(x.name||'Provider')}<br>${customerLocation ? `📏 ${distance.toFixed(1)} km away<br>` : ''}📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`;
    let marker=vehicleMarkers.get(id);
    if(marker){
      marker.setLatLng([lat,lng]);
      marker.setPopupContent(popup);
    }else{
      marker=L.marker([lat,lng]).addTo(map).bindPopup(popup);
      vehicleMarkers.set(id,marker);
    }
  });

  for(const [id,marker] of vehicleMarkers){
    if(!seen.has(id)){marker.remove();vehicleMarkers.delete(id)}
  }

  if(map && bounds.length){
    map.fitBounds(bounds,{padding:[30,30],maxZoom:15});
  }
}

function locateMe(){
  if(!navigator.geolocation){alert('Location is not supported on this device.');return;}
  if(!map){alert('Map is still loading. Please try again.');return;}

  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude,longitude,accuracy}=pos.coords;
    customerLocation={latitude,longitude};
    customerLocationAccuracy=accuracy;
    if(!userMarker){
      userMarker=L.circleMarker([latitude,longitude],{radius:9,weight:3,opacity:1,fillOpacity:.9}).addTo(map);
    }else userMarker.setLatLng([latitude,longitude]);
    userMarker.bindPopup(`Your location<br>Accuracy: about ${Math.round(accuracy)} m`).openPopup();
    map.setView([latitude,longitude],15);
    if(latestSnapshot) render(latestSnapshot);
  },err=>{
    const messages={1:'Location permission was denied. Allow location access for this website in Chrome settings.',2:'Your location could not be determined. Please try again.',3:'Location request timed out. Please try again.'};
    alert(messages[err.code]||'Could not get your location.');
  },{enableHighAccuracy:true,timeout:15000,maximumAge:10000});
}

window.searchProviders=()=>{
  const q=document.querySelector('#search').value.toLowerCase();
  [...box.children].forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?'flex':'none');
};
window.locateMe=locateMe;

initMap();
// Try to get the customer's location so provider cards can show distance in km.
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos=>{
    customerLocation={latitude:pos.coords.latitude,longitude:pos.coords.longitude};
    customerLocationAccuracy=pos.coords.accuracy;
    if(latestSnapshot) render(latestSnapshot);
  },()=>{}, {enableHighAccuracy:true,timeout:10000,maximumAge:30000});
}
onSnapshot(query(collection(db,'providers'),where('status','==','active')),render,err=>{
  console.error('Provider listener error:',err);
  const status=document.querySelector('#mapStatus');
  status.textContent='Could not load active vehicles from Firebase.';
  status.className='map-status error';
});
import {db} from './firebase.js';
import {collection,onSnapshot,query,where} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const box=document.querySelector('#vehicles');
let map;
let userMarker;
const vehicleMarkers=new Map();
let latestSnapshot=null;
let customerLocation=null;
let customerLocationAccuracy=null;

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}


function distanceKm(lat1,lon1,lat2,lon2){
  const R=6371;
  const toRad=v=>v*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function initMap(){
  const status=document.querySelector('#mapStatus');
  map=L.map('map',{zoomControl:true}).setView([10.0,77.0],8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  status.textContent='Map ready';
  status.className='map-status ready';
  if(latestSnapshot) render(latestSnapshot);
}

function render(snap){
  latestSnapshot=snap;
  box.innerHTML='';
  const seen=new Set();
  const bounds=[];

  // First collect all active providers and calculate their distance.
  // Then sort nearest -> farthest before rendering the cards.
  const providers=[];

  snap.forEach(d=>{
    const x=d.data();
    if(String(x.status||'').toLowerCase()!=='active') return;
    // Provider's temporary Stop is separate from the admin-controlled status.
    // Only hide the provider from customers while locationSharing is false.
    if(x.locationSharing === false) return;

    const lat=Number(x.latitude), lng=Number(x.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return;

    const distance=customerLocation
      ? distanceKm(customerLocation.latitude,customerLocation.longitude,lat,lng)
      : Infinity;

    providers.push({id:d.id,data:x,lat,lng,distance});
  });

  // Nearest provider first, farthest provider last.
  providers.sort((a,b)=>a.distance-b.distance);

  providers.forEach(provider=>{
    const {id,data:x,lat,lng,distance}=provider;

    seen.add(id);
    bounds.push([lat,lng]);

    const phone=String(x.whatsapp||x.phone||'').replace(/\D/g,'');
    const wa=phone ? `<a class="whatsapp" target="_blank" rel="noopener" href="https://wa.me/${phone}">💬 WhatsApp</a>` : '';
    const distanceText=customerLocation
      ? `<p class="distance">📏 ${distance.toFixed(1)} km away</p>`
      : `<p class="distance muted">📏 Use my location to see distance</p>`;

    box.innerHTML+=`<article class="card"><span class="pill">ACTIVE</span><h3>${escapeHtml(x.vehicleNumber||'Vehicle')}</h3><p>${escapeHtml(x.name||'Provider')}</p>${distanceText}<p>📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</p>${wa}</article>`;

    if(!map) return;
    const popup=`<div style="min-width:180px"><strong>${escapeHtml(x.vehicleNumber||'Vehicle')}</strong><br>${escapeHtml(x.name||'Provider')}<br>${customerLocation ? `📏 ${distance.toFixed(1)} km away<br>` : ''}📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`;
    let marker=vehicleMarkers.get(id);
    if(marker){
      marker.setLatLng([lat,lng]);
      marker.setPopupContent(popup);
    }else{
      marker=L.marker([lat,lng]).addTo(map).bindPopup(popup);
      vehicleMarkers.set(id,marker);
    }
  });

  for(const [id,marker] of vehicleMarkers){
    if(!seen.has(id)){marker.remove();vehicleMarkers.delete(id)}
  }

  if(map && bounds.length){
    map.fitBounds(bounds,{padding:[30,30],maxZoom:15});
  }
}

function locateMe(){
  if(!navigator.geolocation){alert('Location is not supported on this device.');return;}
  if(!map){alert('Map is still loading. Please try again.');return;}

  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude,longitude,accuracy}=pos.coords;
    customerLocation={latitude,longitude};
    customerLocationAccuracy=accuracy;
    if(!userMarker){
      userMarker=L.circleMarker([latitude,longitude],{radius:9,weight:3,opacity:1,fillOpacity:.9}).addTo(map);
    }else userMarker.setLatLng([latitude,longitude]);
    userMarker.bindPopup(`Your location<br>Accuracy: about ${Math.round(accuracy)} m`).openPopup();
    map.setView([latitude,longitude],15);
    if(latestSnapshot) render(latestSnapshot);
  },err=>{
    const messages={1:'Location permission was denied. Allow location access for this website in Chrome settings.',2:'Your location could not be determined. Please try again.',3:'Location request timed out. Please try again.'};
    alert(messages[err.code]||'Could not get your location.');
  },{enableHighAccuracy:true,timeout:15000,maximumAge:10000});
}

window.searchProviders=()=>{
  const q=document.querySelector('#search').value.toLowerCase();
  [...box.children].forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?'flex':'none');
};
window.locateMe=locateMe;

initMap();
// Try to get the customer's location so provider cards can show distance in km.
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos=>{
    customerLocation={latitude:pos.coords.latitude,longitude:pos.coords.longitude};
    customerLocationAccuracy=pos.coords.accuracy;
    if(latestSnapshot) render(latestSnapshot);
  },()=>{}, {enableHighAccuracy:true,timeout:10000,maximumAge:30000});
}
onSnapshot(query(collection(db,'providers'),where('status','==','active')),render,err=>{
  console.error('Provider listener error:',err);
  const status=document.querySelector('#mapStatus');
  status.textContent='Could not load active vehicles from Firebase.';
  status.className='map-status error';
});


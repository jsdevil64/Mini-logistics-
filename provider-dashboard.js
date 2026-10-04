import {auth,db} from './firebase.js';
import {onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {doc,getDoc,updateDoc} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

let uid;
let providerData;
let watchId = null;

const $ = selector => document.querySelector(selector);
const editModal = $('#editModal');

function openEditModal() {
  $('#editName').value = providerData?.name || '';
  $('#editPhone').value = providerData?.phone || '';
  $('#editVehicle').value = providerData?.vehicleNumber || '';
  $('#editType').value = providerData?.type || '';
  $('#editMsg').textContent = '';
  editModal.classList.add('open');
  editModal.setAttribute('aria-hidden', 'false');
}

function closeEditModal() {
  editModal.classList.remove('open');
  editModal.setAttribute('aria-hidden', 'true');
}

function renderProvider(x) {
  providerData = x;
  $('#welcome').textContent = 'Hello, ' + (x.name || 'Provider');
  $('#vehicle').textContent = x.vehicleNumber || 'Vehicle';
  $('#vehicleType').textContent = x.type || '—';
  $('#status').textContent = x.status?.toUpperCase() || 'ACTIVE';
  $('#subscriptionStatus').textContent = x.subscriptionStatus === 'trial' ? 'Free trial' : (x.subscriptionStatus || 'Active');

  const exp = x.cardExpiry ? new Date(x.cardExpiry) : null;
  $('#expiry').textContent = exp && !Number.isNaN(exp.getTime()) ? exp.toLocaleDateString() : '—';
  const days = exp && !Number.isNaN(exp.getTime()) ? Math.ceil((exp - Date.now()) / 86400000) : 0;
  $('#remaining').textContent = days > 0 ? `Remaining: ${days} days` : 'CARD EXPIRED';

  const message = [
    'AutoDrive Subscription Payment Screenshot',
    `Provider: ${x.name || 'Provider'}`,
    `Phone: ${x.phone || ''}`,
    `Vehicle: ${x.vehicleNumber || ''}`,
    'Payment: ₹100 via UPI',
    'UPI ID: 8939717405@nyes',
    '',
    'I am sending my payment screenshot here for confirmation.'
  ].join('\n');
  $('#sendScreenshotWhatsApp').href = `https://wa.me/918939717405?text=${encodeURIComponent(message)}`;
}

onAuthStateChanged(auth, async u => {
  if (!u) return location.href='provider-login.html';
  uid = u.uid;
  try {
    const s = await getDoc(doc(db,'providers',uid));
    if (!s.exists()) throw new Error('Provider profile not found.');
    renderProvider(s.data());
  } catch (e) {
    $('#paymentMsg').textContent = e.message;
  }
});

$('#logout').onclick = () => signOut(auth).then(() => location.href='provider-login.html');

$('#start').onclick = () => {
  if (!navigator.geolocation) return;
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = navigator.geolocation.watchPosition(async p => {
  await updateDoc(doc(db,'providers',uid), {
    latitude:p.coords.latitude,
    longitude:p.coords.longitude,
    locationUpdatedAt:new Date().toISOString(),
    locationSharing:true
  });
  $('#status').textContent = 'ACTIVE';
  }, err => {
    console.error('Location watch error:', err);
  }, {enableHighAccuracy:true, maximumAge:10000});
};

$('#stop').onclick = async () => {
  if (watchId !== null) {
    navigator.geolocation?.clearWatch(watchId);
    watchId = null;
  }
  await updateDoc(doc(db,'providers',uid), {
    locationSharing:false,
    locationUpdatedAt:new Date().toISOString()
  });
  $('#status').textContent = 'STOPPED';
};

$('#editCard').onclick = openEditModal;
$('#closeEdit').onclick = closeEditModal;
$('#cancelEdit').onclick = closeEditModal;
$('#closeEditBackdrop').onclick = closeEditModal;

$('#editForm').onsubmit = async e => {
  e.preventDefault();
  const button = e.submitter;
  button.disabled = true;
  $('#editMsg').textContent = 'Saving…';
  try {
    const updates = {
      name: $('#editName').value.trim(),
      phone: $('#editPhone').value.trim(),
      vehicleNumber: $('#editVehicle').value.trim().toUpperCase(),
      type: $('#editType').value.trim()
    };
    await updateDoc(doc(db,'providers',uid), updates);
    renderProvider({...providerData, ...updates});
    $('#editMsg').textContent = 'Card updated successfully.';
    setTimeout(closeEditModal, 500);
  } catch (e) {
    $('#editMsg').textContent = e.message || 'Could not update card.';
  } finally {
    button.disabled = false;
  }
};

$('#payUpi').onclick = () => {
  const upiUrl = 'upi://pay?pa=8939717405@nyes&pn=AutoDrive&am=100&cu=INR&tn=AutoDrive%20Subscription';
  window.location.href = upiUrl;
};

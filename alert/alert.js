function showAlert(title, message, redirectUrl = null) {
    let alertDiv = document.getElementById('customAlert');
    if (!alertDiv) {
        alertDiv = document.createElement('div');
        alertDiv.id = 'customAlert';
        alertDiv.className = 'custom-alert-overlay';
        alertDiv.innerHTML = `
            <div class="custom-alert-box">
                <h3 id="alertTitle">Notifikasi</h3>
                <p id="alertMessage">Pesan</p>
                <button class="custom-alert-btn" onclick="closeAlert()">Oke</button>
            </div>
        `;
        document.body.appendChild(alertDiv);
    }
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = message;
    alertDiv.classList.add('active');
    window.currentRedirect = redirectUrl;
}
  function closeAlert() {
    const alertDiv = document.getElementById('customAlert');
    if (alertDiv) alertDiv.classList.remove('active');
    if (window.currentRedirect) window.location.href = window.currentRedirect;
  }

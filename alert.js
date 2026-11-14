function showAlert(title, message, redirectUrl = null) {
    let alertDiv = document.getElementById('customAlert');
    
    // Kalau div-nya belum ada, bikin baru beserta CSS-nya
    if (!alertDiv) {
        // 1. Inject CSS
        const style = document.createElement('style');
        style.innerHTML = `
            .custom-alert-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
                z-index: 9999; display: flex; justify-content: center; align-items: center;
                opacity: 0; visibility: hidden; transition: all 0.3s ease;
            }
            .custom-alert-overlay.active { opacity: 1; visibility: visible; }
            .custom-alert-box {
                background: #23252b; border: 1px solid #333; border-radius: 20px;
                padding: 25px; width: 85%; max-width: 350px; text-align: center;
                transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .custom-alert-overlay.active .custom-alert-box { transform: scale(1); }
            .custom-alert-box h3 { color: #fff; font-size: 18px; font-weight: 700; margin-bottom: 10px; }
            .custom-alert-box p { color: #8b94b0; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
            .custom-alert-btn {
                background: transparent; border: none; color: #3b82f6; 
                font-size: 16px; font-weight: 600; cursor: pointer; padding: 10px;
            }
        `;
        document.head.appendChild(style);

        // 2. Inject HTML
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
    
    // Munculin notifnya
    setTimeout(() => {
        alertDiv.classList.add('active');
    }, 10);
    
    window.currentRedirect = redirectUrl;
}

function closeAlert() {
    const alertDiv = document.getElementById('customAlert');
    if (alertDiv) {
        alertDiv.classList.remove('active');
    }
    if (window.currentRedirect) {
        window.location.href = window.currentRedirect;
    }
}

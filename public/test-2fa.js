document.addEventListener('DOMContentLoaded', () => {
  const renderButton = document.getElementById('renderButton');
  if (renderButton) {
    renderButton.addEventListener('click', renderQRCode);
  }
});

function renderQRCode() {
  const qrCodeDataEl = document.getElementById('qrCodeData');
  let qrCodeData = qrCodeDataEl.value;
  const qrCodeContainer = document.getElementById('qrcode');

  qrCodeContainer.innerHTML = '';

  if (!qrCodeData.trim()) {
    qrCodeContainer.innerHTML =
      '<p style="color: orange; font-weight: bold;">Textarea is empty. Please paste the QR code data.</p>';
    return;
  }

  let cleanedData = qrCodeData.replace(/(\r\n|\n|\r|\s|\||\")/gm, '');
  console.log('Cleaned data:', cleanedData);

  if (!cleanedData.startsWith('data:image/png;base64,')) {
    console.log(
      'Data does not start with the required prefix. Attempting to fix...'
    );
    if (cleanedData.startsWith('image/png;base64,')) {
      cleanedData = 'data:' + cleanedData;
      console.log('Prepended "data:" prefix. New data URL:', cleanedData);
    } else {
      console.error('Invalid data format. It must be a PNG data URL.');
      qrCodeContainer.innerHTML =
        '<p style="color: red; font-weight: bold;">Invalid format. The pasted data must be a PNG data URL starting with "data:image/png;base64,".</p>';
      return;
    }
  }

  const img = document.createElement('img');

  img.onload = () => {
    console.log('Image loaded successfully!');
    qrCodeContainer.appendChild(img);
  };

  img.onerror = () => {
    console.error(
      'Image failed to load. The data URL might be corrupt or incomplete.'
    );
    qrCodeContainer.innerHTML =
      '<p style="color: red; font-weight: bold;">Could not render the image. The data URL seems to be corrupt or incomplete. Please check the console for more details.</p>';
  };

  img.src = cleanedData;
}

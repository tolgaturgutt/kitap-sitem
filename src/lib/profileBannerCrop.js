const DEFAULT_OUTPUT = { width: 2048, height: 1152, fileName: 'profile-banner.jpg' };

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Seçilen görsel açılamadı.'));
    };
    image.src = url;
  });
}

export async function cropProfileBanner(source, transform, output = DEFAULT_OUTPUT) {
  const { width: outputWidth, height: outputHeight, fileName } = { ...DEFAULT_OUTPUT, ...output };
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Görsel işleme başlatılamadı.');

  context.fillStyle = '#09090b';
  context.fillRect(0, 0, outputWidth, outputHeight);

  const baseScale = Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
  const scale = baseScale * transform.zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const maxX = Math.max(0, (width - outputWidth) / 2);
  const maxY = Math.max(0, (height - outputHeight) / 2);
  const centerX = (outputWidth / 2) + (transform.x * maxX);
  const centerY = (outputHeight / 2) + (transform.y * maxY);

  context.drawImage(image, centerX - (width / 2), centerY - (height / 2), width, height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('Kapak görseli oluşturulamadı.')),
      'image/jpeg',
      0.9
    );
  });

  return new File([blob], fileName, { type: 'image/jpeg' });
}

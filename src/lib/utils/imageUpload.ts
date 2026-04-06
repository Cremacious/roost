export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateReceiptImage(file: File): string | null {
  const maxSize = 10 * 1024 * 1024;
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

  if (file.size > maxSize) {
    return "Image must be under 10MB";
  }
  if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".heic")) {
    return "Please upload a JPG, PNG, or HEIC image";
  }
  return null;
}

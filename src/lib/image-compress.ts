/**
 * Compression d'image côté client via Canvas.
 *
 * - Resize en gardant l'aspect ratio, contraint à `maxDimension` (carré max).
 * - Encode en JPEG avec `quality` (0–1) pour produire un dataURL léger.
 * - Conserve les images plus petites que la cible sans recompresser inutilement.
 *
 * Cas d'usage typique : avatar utilisateur — on accepte des photos de
 * téléphone (3–8 Mo) et on retourne un base64 ~50–200 ko à stocker en DB.
 */

export interface CompressOptions {
  /** Côté maximum (largeur ou hauteur), l'autre est ajusté pour conserver l'aspect. */
  maxDimension?: number;
  /** Qualité JPEG entre 0 et 1. */
  quality?: number;
  /** Format de sortie. JPEG par défaut (meilleure compression pour photos). */
  outputType?: "image/jpeg" | "image/webp" | "image/png";
}

export interface CompressResult {
  dataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const {
    maxDimension = 512,
    quality = 0.85,
    outputType = "image/jpeg",
  } = options;

  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier n'est pas une image.");
  }

  const originalSizeKb = Math.round(file.size / 1024);

  // Charge l'image dans un HTMLImageElement.
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  // Calcule la taille cible en gardant l'aspect.
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  // Dessine sur un canvas + récupère le dataURL compressé.
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponible.");
  // Fond blanc pour les images avec transparence converties en JPEG.
  if (outputType === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  const compressedDataUrl = canvas.toDataURL(outputType, quality);

  // Estime la taille du base64 (b64 ~ 1.37× binaire) — on enlève le préfixe.
  const base64Body = compressedDataUrl.split(",")[1] ?? "";
  const compressedSizeKb = Math.round((base64Body.length * 0.75) / 1024);

  return {
    dataUrl: compressedDataUrl,
    originalSizeKb,
    compressedSizeKb,
    width,
    height,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Lecture du fichier échouée."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Lecture échouée."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = dataUrl;
  });
}

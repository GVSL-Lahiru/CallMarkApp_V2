export async function translateToEnglish(text: string): Promise<string> {
  if (!text || !navigator.onLine) return text;

  // Check for Sinhala (\u0D80-\u0DFF) or Tamil (\u0B80-\u0BFF) characters
  const needsTranslation = /[\u0D80-\u0DFF\u0B80-\u0BFF]/.test(text);
  if (!needsTranslation) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        // data[0] is an array of segments, e.g., [["translated text", "original text", ...], ...]
        return data[0].map((item: any) => item[0]).join('');
      }
    }
  } catch (e) {
    console.error("Translation failed", e);
  }
  
  return text;
}

const IMGBB_API_KEY = "8651c8d21d91d90c780590fa34ee35aa";

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      return result.data.url;
    } else {
      throw new Error(result.error?.message || "فشلت عملية رفع الصورة");
    }
  } catch (error) {
    console.error("Image upload error:", error);
    throw error;
  }
}

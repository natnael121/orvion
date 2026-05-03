export const uploadImageToImgBB = async (imageFile: string | Blob): Promise<string> => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) {
        console.error("No ImgBB API Key provided");
        throw new Error("Missing ImgBB API Key");
    }

    const formData = new FormData();

    if (typeof imageFile === 'string') {
        // Check if it's base64
        const base64Data = imageFile.replace(/^data:image\/[a-z]+;base64,/, "");
        formData.append("image", base64Data);
    } else {
        formData.append("image", imageFile);
    }

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorDetails = await response.text()
            console.error("ImgBB upload failed", errorDetails)
            throw new Error('Image upload to ImgBB failed');
        }

        const data = await response.json();
        return data.data.url; // The direct URL to the image
    } catch (error) {
        console.error("Error uploading to ImgBB:", error);
        throw error;
    }
};

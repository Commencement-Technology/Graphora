// utils/uploadToCloudinary.ts

const CLOUDINARY_UPLOAD_PRESET = 'listenink';
const CLOUDINARY_CLOUD_NAME = 'dzafmq9tj';

// Define the shape of the object that will be returned
export interface CloudinaryUploadResult {
    secure_url: string;
    public_id: string;
}

export const uploadToCloudinary = async (fileUri: string, fileType: string): Promise<CloudinaryUploadResult> => {
    try {
        console.log('[Cloudinary] Preparing upload for:', fileUri, 'Type:', fileType);

        const formData = new FormData();

        formData.append('file', {
            uri: fileUri,
            type: fileType,
            name: `upload_${Date.now()}.${fileType.split('/')[1] || 'jpg'}`,
        } as any);

        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        console.log('[Cloudinary] Response data:', data);

        if (response.ok) {
            if (data.secure_url && data.public_id) {
                console.log('[Cloudinary] Upload successful! URL:', data.secure_url, 'Public ID:', data.public_id);
                // ✅ Return an object containing both secure_url and public_id
                return {
                    secure_url: data.secure_url,
                    public_id: data.public_id,
                };
            } else {
                console.error('[Cloudinary] Upload successful (HTTP 200 OK) but missing secure_url or public_id:', data);
                throw new Error('Cloudinary upload successful but missing expected data (secure_url or public_id).');
            }
        } else {
            const errorMessage = data.error?.message || `Cloudinary upload failed with status ${response.status}.`;
            console.error('[Cloudinary] Upload failed with HTTP status:', response.status, 'Error:', errorMessage);
            throw new Error(errorMessage);
        }
    } catch (error: any) {
        console.error('[Cloudinary] Fatal Upload Error:', error.message || error);
        throw new Error(`Failed to upload to Cloudinary: ${error.message || 'Unknown error'}`);
    }
};
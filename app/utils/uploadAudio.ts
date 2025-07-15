// app/utils/uploadAudio.ts
import storage from '@react-native-firebase/storage';

export const uploadAudio = async (localFilePath: string, userId: string): Promise<string | null> => {
  try {
    const filename = `audioStories/${userId}_${Date.now()}.mp4`; // or .aac/.m4a based on recorder format
    const ref = storage().ref(filename);

    await ref.putFile(localFilePath);
    const downloadURL = await ref.getDownloadURL();

    console.log(' Uploaded to Firebase Storage:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error(' Upload failed:', error);
    return null;
  }
};

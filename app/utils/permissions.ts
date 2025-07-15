// src/utils/permissions.ts
import { Alert, PermissionsAndroid, Platform } from 'react-native';

/**
 * Requests necessary Android permissions for audio recording and external storage access.
 * Handles differences for newer Android versions regarding storage permissions.
 * @returns {Promise<boolean>} True if all required permissions are granted, false otherwise.
 */
export async function requestAndroidAudioPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // For iOS, permissions are typically handled in Info.plist and not via runtime prompts like this.
    return true;
  }

  try {
    const permissionsToRequest = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      // WRITE_EXTERNAL_STORAGE with maxSdkVersion="28" is for older Android versions.
      // It's still often requested by native audio libraries, so we include it.
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    ];

    // For reading media, Android 13+ uses more granular permissions.
    // For older versions, READ_EXTERNAL_STORAGE is used.
    // We request READ_EXTERNAL_STORAGE for broadest compatibility,
    // as Android handles which one to apply based on API level and manifest.
    // If you explicitly need READ_MEDIA_IMAGES/VIDEO/AUDIO for API 33+, add them here.
    // However, react-native-image-picker often handles its own internal permission check for images.
    permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);


    const grants = await PermissionsAndroid.requestMultiple(permissionsToRequest);

    const recordAudioGranted = grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
    const writeStorageGranted = grants[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
    const readStorageGranted = grants[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
    // If READ_MEDIA_IMAGES was requested, you'd check it here too:
    // const readMediaImagesGranted = grants[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED;


    if (!recordAudioGranted) {
      Alert.alert('Permission Required', 'Microphone permission is essential for recording audio.');
      return false;
    }

    // On Android 10+ (API 29+), WRITE_EXTERNAL_STORAGE won't be granted if maxSdkVersion="28" is in manifest,
    // but the app can still write to app-specific directories.
    // So, we only strictly check it for older Android versions (pre-API 29) if it's truly critical.
    // For the audio recorder library, if RECORD_AUDIO is granted, it might still work.
    // Let's make it a strict requirement for older Android or if recording fails without it.
    if (Platform.Version < 29 && !writeStorageGranted) {
        Alert.alert('Permission Required', 'Storage write permission is needed for saving recordings on older Android.');
        return false;
    }

    // For image picking with react-native-image-picker, it generally requests what it needs.
    // If you explicitly use images/media in this component, you might add checks here.
    // For now, focusing on audio permissions.

    return true; // All critical permissions (RECORD_AUDIO) are granted, and storage is handled.

  } catch (err) {
    console.warn("Android Permissions request error:", err);
    Alert.alert('Permission Error', 'Failed to request necessary permissions: ' + (err as Error).message);
    return false;
  }
}
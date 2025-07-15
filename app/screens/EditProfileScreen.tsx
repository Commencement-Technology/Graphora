// app/screens/EditProfileScreen.tsx

import { getApp } from '@react-native-firebase/app';
import { getAuth, updateProfile } from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore'; // Import getDoc and setDoc
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView, // Use ScrollView for content that might exceed screen height
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../context/ThemeContext';
import { uploadToCloudinary } from '../utils/uploadToCloudinary'; // Your Cloudinary upload utility

// Initialize Firebase instances outside the component
const app = getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

// Define RootStackParamList (ensure this matches your main navigation types)
type RootStackParamList = {
    Profile: undefined; // Navigate back to ProfileScreen
    // Add other relevant screens if needed
};

// Define the type for navigation prop specific to this screen
type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

const EditProfileScreen = () => {
    const navigation = useNavigation<EditProfileScreenNavigationProp>();
    const { theme } = useTheme();

    const currentUser = auth.currentUser;

    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [profileImageData, setProfileImageData] = useState<{ uri: string; type: string } | null>(null);
    const [currentProfilePicUrl, setCurrentProfilePicUrl] = useState<string | null>(null); // To display current image
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(true); // For initial data fetch
    const [isSaving, setIsSaving] = useState(false); // For save operation

    const DEFAULT_AVATAR_URL = 'https://i.ibb.co/VvZQ0B7/default-avatar.png';

    // --- Fetch User Profile Data on Mount ---
    useEffect(() => {
        const fetchUserData = async () => {
            if (!currentUser) {
                Alert.alert('Error', 'You must be logged in to edit your profile.');
                navigation.goBack();
                return;
            }

            try {
                // Fetch from Firebase Auth first
                setDisplayName(currentUser.displayName || '');
                setCurrentProfilePicUrl(currentUser.photoURL || DEFAULT_AVATAR_URL);

                // Then fetch from Firestore for bio and potentially more accurate userName
                const userDocRef = doc(firestore, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setDisplayName(userData?.userName || currentUser.displayName || '');
                    setBio(userData?.bio || '');
                    setCurrentProfilePicUrl(userData?.profileImageURL || currentUser.photoURL || DEFAULT_AVATAR_URL);
                }
            } catch (error) {
                console.error("Error fetching user data for edit:", error);
                Alert.alert('Error', 'Failed to load profile data for editing.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [currentUser, navigation]);

    // --- Handle Image Picking ---
    const handleImagePick = async () => {
        if (isSaving) return; // Prevent picking image during save operation
        try {
            const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
            if (result.didCancel) return;
            const asset = result.assets?.[0];
            if (asset?.uri && asset?.type) {
                setProfileImageData({ uri: asset.uri, type: asset.type });
                setCurrentProfilePicUrl(asset.uri); // Immediately show the new image in UI
            } else {
                Alert.alert('Error', 'Could not get image data from selected asset. Please try again.');
            }
        } catch (error) {
            console.error('Profile Image Pick Error:', error);
            Alert.alert('Error', 'Failed to pick profile image. Please check permissions.');
        }
    };

    // Sanitize username for Firestore storage and searching
    const sanitizeUsername = (input: string) =>
        input.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');

    // --- Handle Saving Profile ---
    const handleSaveProfile = async () => {
        setErrorMsg('');
        if (!currentUser) {
            setErrorMsg('You must be logged in to save changes.');
            return;
        }
        if (!displayName.trim()) {
            setErrorMsg('Display Name cannot be empty.');
            return;
        }

        const sanitizedUserName = sanitizeUsername(displayName);
        if (!sanitizedUserName) {
            setErrorMsg('Display Name can only contain English letters, numbers, underscores, and periods.');
            return;
        }

        setIsSaving(true);

        try {
            let newProfileImageURL = currentProfilePicUrl; // Start with current or default URL

            // 1. Upload new profile image if selected
            if (profileImageData) {
                const uploadResult = await uploadToCloudinary(profileImageData.uri, profileImageData.type);
                newProfileImageURL = uploadResult.secure_url;
            }

            // 2. Update Firebase Authentication profile (displayName and photoURL)
            await updateProfile(currentUser, {
                displayName: displayName.trim(),
                photoURL: newProfileImageURL,
            });

            // 3. Update Firestore user document
            const userDocRef = doc(firestore, 'users', currentUser.uid);
            await setDoc(userDocRef, {
                userName: displayName.trim(), // Original case
                userName_lowercase: sanitizedUserName, // Lowercase for search
                bio: bio.trim(),
                profileImageURL: newProfileImageURL,
                // Do NOT update createdAt here, it's a creation timestamp
                // You might add an 'updatedAt: serverTimestamp()' if you track last update time
            }, { merge: true }); // Use merge: true to only update specified fields

            Alert.alert('Success', 'Profile updated successfully!', [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack(), // Go back to ProfileScreen
                },
            ]);

        } catch (error: any) {
            console.error('Error saving profile:', error);
            let message = 'Failed to save profile. Please try again.';
            if (error.code === 'firestore/permission-denied') {
                message = 'Permission denied to update profile. Check Firestore rules.';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Network error. Please check your internet connection.';
            }
            setErrorMsg(message);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Loading State for Initial Fetch ---
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textLight }]}>Loading profile data...</Text>
            </SafeAreaView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Text style={[styles.headerButtonText, { color: theme.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSaveProfile} style={styles.headerButton} disabled={isSaving}>
                    {isSaving ? (
                        <ActivityIndicator color={theme.primary} />
                    ) : (
                        <Text style={[styles.headerButtonText, { color: theme.primary, fontWeight: 'bold' }]}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {/* Profile Image Section */}
                <View style={styles.profileImageSection}>
                    <TouchableOpacity onPress={handleImagePick} disabled={isSaving}>
                        <Image
                            source={{ uri: currentProfilePicUrl || DEFAULT_AVATAR_URL }}
                            style={styles.profileImage}
                        />
                        <View style={styles.changePhotoButton}>
                            <Text style={[styles.changePhotoButtonText, { color: theme.primary }]}>Change Profile Photo</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Input Fields */}
                <View style={styles.inputSection}>
                    <Text style={[styles.inputLabel, { color: theme.textLight }]}>Name</Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                borderColor: theme.borderColor,
                                color: theme.text,
                                backgroundColor: theme.inputBackground,
                            },
                        ]}
                        placeholder="Your Name"
                        placeholderTextColor={theme.placeholderTextColor}
                        value={displayName}
                        onChangeText={setDisplayName}
                        autoCapitalize="words" // Suggest capitalization for names
                        editable={!isSaving}
                    />

                    <Text style={[styles.inputLabel, { color: theme.textLight, marginTop: 15 }]}>Bio</Text>
                    <TextInput
                        style={[
                            styles.input,
                            styles.bioInput, // Specific style for bio
                            {
                                borderColor: theme.borderColor,
                                color: theme.text,
                                backgroundColor: theme.inputBackground,
                            },
                        ]}
                        placeholder="Tell us about yourself..."
                        placeholderTextColor={theme.placeholderTextColor}
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={4} // Suggests height for multiline
                        editable={!isSaving}
                    />
                </View>

                {errorMsg ? <Text style={[styles.error, { color: theme.errorText }]}>{errorMsg}</Text> : null}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderBottomWidth: 0.5,
        borderColor: '#E0E0E0', // Fallback, use theme.borderColor
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerButton: {
        padding: 5,
    },
    headerButtonText: {
        fontSize: 16,
    },
    scrollViewContent: {
        paddingBottom: 30, // Extra padding at bottom for keyboard
    },
    profileImageSection: {
        alignItems: 'center',
        paddingVertical: 30,
        borderBottomWidth: 0.5,
        borderColor: '#E0E0E0', // Fallback, use theme.borderColor
        marginBottom: 20,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#DDDDDD', // Fallback, use theme.borderColor
        marginBottom: 10,
    },
    changePhotoButton: {
        paddingVertical: 5,
    },
    changePhotoButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    inputSection: {
        paddingHorizontal: 20,
    },
    inputLabel: {
        fontSize: 13,
        marginBottom: 5,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 10,
    },
    bioInput: {
        height: 100, // Fixed height for bio input
        textAlignVertical: 'top', // Aligns text to the top for multiline
    },
    error: {
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 20,
        fontSize: 14,
        fontWeight: '500',
    },
});
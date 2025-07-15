// app/screens/RegisterScreen.tsx

import { getApp } from '@react-native-firebase/app';
import { createUserWithEmailAndPassword, getAuth, updateProfile } from '@react-native-firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
// Import the uploadToCloudinary function
import { uploadToCloudinary } from '../utils/uploadToCloudinary';

const app = getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

type RootStackParamList = {
    Login: undefined;
    AppTabs: {
        screen: string;
        params?: { screen: string };
    };
};

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const RegisterScreen = () => {
    const navigation = useNavigation<RegisterScreenNavigationProp>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [profileImageData, setProfileImageData] = useState<{ uri: string; type: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const { theme } = useTheme();

    const DEFAULT_AVATAR_URL = 'https://i.ibb.co/VvZQ0B7/default-avatar.png';

    const handleImagePick = async () => {
        if (isRegistering) return;
        try {
            const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
            if (result.didCancel) return;
            const asset = result.assets?.[0];
            if (asset?.uri && asset?.type) {
                setProfileImageData({ uri: asset.uri, type: asset.type });
            } else {
                Alert.alert('Error', 'Could not get image data from selected asset. Please try again.');
            }
        } catch (error) {
            console.error('Profile Image Pick Error:', error);
            Alert.alert('Error', 'Failed to pick profile image. Please check app permissions.');
        }
    };

    const sanitizeUsername = (input: string) =>
        input.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');

    const handleRegister = async () => {
        setErrorMsg('');

        if (!email.trim() || !password.trim() || !userName.trim()) {
            setErrorMsg('All fields (Name, Email, Password) are required.');
            return;
        }

        if (password.length < 6) {
            setErrorMsg('Password must be at least 6 characters long.');
            return;
        }

        const sanitizedUserName = sanitizeUsername(userName);
        if (!sanitizedUserName) {
            setErrorMsg('Username can only contain English letters, numbers, underscores, and periods.');
            return;
        }

        setIsRegistering(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;
            // ⭐ FIX 1: Change profileImageURL type definition to string | null
            // It was implicitly string | undefined, but explicit null is better here
            let profileImageURL: string | null = null;

            if (profileImageData) {
                // ⭐ FIX 2: Access .secure_url from the returned object
                const uploadResult = await uploadToCloudinary(profileImageData.uri, profileImageData.type);
                profileImageURL = uploadResult.secure_url;
            } else {
                profileImageURL = DEFAULT_AVATAR_URL;
            }

            if (user) {
                await updateProfile(user, {
                    displayName: userName.trim(),
                    photoURL: profileImageURL,
                });
            }

            if (user?.uid) {
                await setDoc(doc(firestore, 'users', user.uid), {
                    uid: user.uid,
                    email: user.email,
                    userName: userName.trim(),
                    userName_lowercase: sanitizedUserName,
                    profileImageURL: profileImageURL, // This now correctly holds a string
                    createdAt: serverTimestamp(),
                });
            } else {
                throw new Error("User UID not found after successful Firebase authentication.");
            }

            Alert.alert('Success', 'Welcome to ListenInk! Your account has been created.', [
                {
                    text: 'Start Listening',
                    onPress: () => {
                        navigation.replace('AppTabs', {
                            screen: 'Home',
                            params: {
                                screen: 'HomeFeed',
                            },
                        });
                    },
                },
            ]);

        } catch (error: any) {
            console.error('Registration error:', error);
            let message = 'Registration failed. Please check your network and try again.';
            if (error.code === 'auth/email-already-in-use') {
                message = 'This email address is already registered. Please try logging in instead.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'The email address format is invalid.';
            } else if (error.code === 'auth/operation-not-allowed') {
                message = 'Email/password authentication is currently disabled. Please contact support.';
            } else if (error.code === 'auth/weak-password') {
                message = 'The password is too weak. Please use at least 6 characters.';
            } else if (error.code === 'firestore/permission-denied') {
                message = 'A permissions issue prevented saving your profile data. Please contact support.';
            }
            setErrorMsg(message);
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            <Text style={[styles.title, { color: theme.primary }]}>Join ListenInk 🎧✍️</Text>

            <TouchableOpacity onPress={handleImagePick} style={styles.profileImageContainer} disabled={isRegistering}>
                {profileImageData?.uri ? (
                    <Image source={{ uri: profileImageData.uri }} style={styles.profileImage} />
                ) : (
                    <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
                        <Icon name="camera-outline" size={40} color={theme.textLight} />
                        <Text style={[styles.profileImagePlaceholderText, { color: theme.textLight }]}>
                            Add Profile Photo
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            <TextInput
                placeholder="Your Name (e.g., JaneDoe)"
                value={userName}
                onChangeText={setUserName}
                style={[
                    styles.input,
                    {
                        borderColor: theme.borderColor,
                        color: theme.text,
                        backgroundColor: theme.inputBackground,
                    },
                ]}
                placeholderTextColor={theme.placeholderTextColor}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isRegistering}
            />

            <TextInput
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                style={[
                    styles.input,
                    {
                        borderColor: theme.borderColor,
                        color: theme.text,
                        backgroundColor: theme.inputBackground,
                    },
                ]}
                placeholderTextColor={theme.placeholderTextColor}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isRegistering}
            />

            <TextInput
                placeholder="Password (min 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[
                    styles.input,
                    {
                        borderColor: theme.borderColor,
                        color: theme.text,
                        backgroundColor: theme.inputBackground,
                    },
                ]}
                placeholderTextColor={theme.placeholderTextColor}
                editable={!isRegistering}
            />

            {errorMsg ? <Text style={[styles.error, { color: theme.errorText }]}>{errorMsg}</Text> : null}

            <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleRegister}
                disabled={isRegistering}
            >
                {isRegistering ? (
                    <ActivityIndicator color={theme.buttonText} />
                ) : (
                    <Text style={[styles.buttonText, { color: theme.buttonText }]}>Register</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isRegistering}>
                <Text style={[styles.loginLink, { color: theme.textLight }]}>
                    Already have an account? <Text style={{ color: theme.accent, fontWeight: 'bold' }}>Login</Text>
                </Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
};

export default RegisterScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
        textAlign: 'center',
    },
    profileImageContainer: {
        alignSelf: 'center',
        marginBottom: 30,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#ddd',
    },
    profileImagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    profileImagePlaceholderText: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 10,
        marginTop: 5,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
        fontSize: 16,
    },
    error: {
        textAlign: 'center',
        marginBottom: 16,
        fontSize: 14,
        fontWeight: '500',
    },
    button: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        minHeight: 55,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '600',
    },
    loginLink: {
        marginTop: 20,
        textAlign: 'center',
        fontSize: 15,
    }
});
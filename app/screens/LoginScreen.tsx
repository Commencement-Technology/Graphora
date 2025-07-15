import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LoginScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const { theme } = useTheme();

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: "985745446961-cp0cg6ehon5bcsdph7q417b8c580i0m3.apps.googleusercontent.com",
        });
    }, []);

    const handleEmailLogin = async () => {
        setErrorMsg('');
        if (!email.trim() || !password.trim()) {
            setErrorMsg('Please enter both email and password.');
            return;
        }

        setIsLoading(true);
        try {
            const auth = getAuth();
            await signInWithEmailAndPassword(auth, email.trim(), password);
            navigation.replace('AppTabs', { screen: 'Home', params: { screen: 'HomeFeed' } });
        } catch (error: any) {
            console.error('Login Failed:', error);
            const msgMap: Record<string, string> = {
                'auth/invalid-email': 'That email address is invalid!',
                'auth/user-disabled': 'This user has been disabled.',
                'auth/user-not-found': 'User not found.',
                'auth/wrong-password': 'Incorrect password.',
            };
            setErrorMsg(msgMap[error.code] || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setErrorMsg('');
        setIsLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const { idToken } = userInfo;
            const googleCredential = GoogleAuthProvider.credential(idToken);
            await getAuth().signInWithCredential(googleCredential);

            navigation.replace('AppTabs', { screen: 'Home', params: { screen: 'HomeFeed' } });
        } catch (error: any) {
            console.error('Google Sign-In error:', error);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                setErrorMsg('Google Sign-In cancelled.');
            } else {
                setErrorMsg('Google Sign-In failed. Try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Text style={[styles.title, { color: theme.primary }]}>Login to Graphora</Text>

            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={[
                    styles.input,
                    {
                        borderColor: theme.primary,
                        color: theme.text,
                        backgroundColor: theme.inputBackground,
                    },
                ]}
                placeholderTextColor={theme.placeholderTextColor}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
            />

            <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[
                    styles.input,
                    {
                        borderColor: theme.primary,
                        color: theme.text,
                        backgroundColor: theme.inputBackground,
                    },
                ]}
                placeholderTextColor={theme.placeholderTextColor}
                editable={!isLoading}
            />

            {errorMsg ? <Text style={[styles.error, { color: theme.error }]}>{errorMsg}</Text> : null}

            <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleEmailLogin}
                disabled={isLoading}
            >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
            </TouchableOpacity>

            <Text style={{ textAlign: 'center', marginVertical: 12, color: theme.textLight }}>or</Text>

            <TouchableOpacity
                style={[styles.googleButton, { backgroundColor: '#FFFFFF', borderColor: theme.borderColor }]}
                onPress={handleGoogleLogin}
                disabled={isLoading}
            >
                <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
                    style={styles.googleLogo}
                />
                <Text style={[styles.buttonText, { color: '#000' }]}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={isLoading}>
                <Text style={{ marginTop: 20, color: theme.accent, textAlign: 'center' }}>
                    Don't have an account? Register
                </Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 28,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
        fontSize: 16,
    },
    error: {
        textAlign: 'center',
        marginBottom: 10,
        fontSize: 14,
        fontWeight: '500',
    },
    button: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    googleButton: {
        borderWidth: 1,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    googleLogo: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
});

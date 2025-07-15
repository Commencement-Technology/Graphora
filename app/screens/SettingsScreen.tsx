import { FirebaseAuthTypes, getAuth, signOut } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

type SettingsScreenNavProp = any;

const SettingsScreen = () => {
    const { theme, toggleTheme, setMode } = useTheme();
    const navigation = useNavigation<SettingsScreenNavProp>();
    const auth = getAuth();
    const [currentUser, setCurrentUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [logoutSwitchValue, setLogoutSwitchValue] = useState(false); // 🆕 state to control logout switch

    useEffect(() => {
        const subscriber = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            if (!user) {
                setMode('light');
                setLogoutSwitchValue(false); // 🧠 reset logout switch when logged out
            }
        });
        return subscriber;
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setMode('light');
            Alert.alert('Success', 'You have been logged out.');
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        } finally {
            setLogoutSwitchValue(false); // 🔄 Reset switch back to OFF
        }
    };

    const onLogoutSwitchChange = (value: boolean) => {
        if (value) {
            Alert.alert('Log Out', 'Are you sure you want to log out?', [
                { text: 'Cancel', onPress: () => setLogoutSwitchValue(false), style: 'cancel' },
                {
                    text: 'Log Out',
                    onPress: handleLogout,
                    style: 'destructive',
                },
            ]);
        } else {
            setLogoutSwitchValue(false); // Reset if toggled off
        }
    };

    const SettingItem = ({
        iconName,
        label,
        onPress,
        isSwitch = false,
        switchValue = false,
        onSwitchChange,
        disabled = false,
    }: {
        iconName?: string;
        label: string;
        onPress?: () => void;
        isSwitch?: boolean;
        switchValue?: boolean;
        onSwitchChange?: (value: boolean) => void;
        disabled?: boolean;
    }) => (
        <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.borderColor }]}
            onPress={onPress}
            disabled={isSwitch || disabled}
        >
            {iconName && <Icon name={iconName} size={22} color={theme.textLight} style={styles.settingIcon} />}
            <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
            {isSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    disabled={disabled}
                    thumbColor={theme.primary}
                    trackColor={{ false: theme.textLight, true: theme.primary }}
                />
            ) : (
                <Icon name="chevron-forward-outline" size={20} color={theme.textLight} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={26} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
                </View>

                {/* --- Account Section --- */}
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>Account</Text>
                <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
                    <SettingItem
                        label="Edit Profile"
                        iconName="person-outline"
                        onPress={() => Alert.alert('Edit Profile', 'Navigate to Edit Profile screen.')}
                    />
                    <SettingItem
                        label="Change Password"
                        iconName="lock-closed-outline"
                        onPress={() => Alert.alert('Change Password', 'Navigate to Change Password screen.')}
                    />
                    <SettingItem
                        label="Dark Mode"
                        iconName="moon-outline"
                        isSwitch={true}
                        switchValue={theme.mode === 'dark'}
                        onSwitchChange={toggleTheme}
                        disabled={!currentUser}
                    />
                </View>

                {/* --- Content Section --- */}
                <Text style={[styles.sectionTitle, { color: theme.primary, marginTop: 20 }]}>Content & Activity</Text>
                <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
                    <SettingItem
                        label="Your Activity"
                        iconName="time-outline"
                        onPress={() => Alert.alert('Your Activity', 'Navigate to Your Activity screen.')}
                    />
                    <SettingItem
                        label="Saved"
                        iconName="bookmark-outline"
                        onPress={() => Alert.alert('Saved', 'Navigate to Saved stories screen.')}
                    />
                    <SettingItem
                        label="Privacy"
                        iconName="shield-checkmark-outline"
                        onPress={() => Alert.alert('Privacy', 'Navigate to Privacy settings.')}
                    />
                </View>

                {/* --- Support Section --- */}
                <Text style={[styles.sectionTitle, { color: theme.primary, marginTop: 20 }]}>Support & About</Text>
                <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
                    <SettingItem
                        label="Help"
                        iconName="help-circle-outline"
                        onPress={() => Alert.alert('Help', 'Navigate to Help Center.')}
                    />
                    <SettingItem
                        label="About"
                        iconName="information-circle-outline"
                        onPress={() => Alert.alert('About', 'Show app version and info.')}
                    />
                </View>

                {/* --- Logout Switch --- */}
                {currentUser && (
                    <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
                        <SettingItem
                            label="Log Out"
                            iconName="log-out-outline"
                            isSwitch={true}
                            switchValue={logoutSwitchValue}
                            onSwitchChange={onLogoutSwitchChange}
                        />
                    </View>
                )}

                {!currentUser && (
                    <Text style={[styles.notLoggedInText, { color: theme.textLight }]}>
                        You are currently not logged in.
                    </Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollViewContent: { paddingVertical: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingBottom: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginBottom: 20,
    },
    backButton: { position: 'absolute', left: 15, padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 20,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    sectionCard: {
        borderRadius: 10,
        marginHorizontal: 15,
        marginBottom: 20,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    settingIcon: { marginRight: 15, width: 24, textAlign: 'center' },
    settingLabel: { flex: 1, fontSize: 16 },
    notLoggedInText: {
        textAlign: 'center',
        marginTop: 30,
        fontSize: 15,
        fontStyle: 'italic',
    },
});

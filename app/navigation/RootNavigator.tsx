// app/navigation/RootNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

interface Props {
    user: any;
}

const RootNavigator = ({ user }: Props) => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                // 🔐 Authenticated flow
                <>
                    <Stack.Screen name="AppTabs" component={TabNavigator} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </>
            )}
        </Stack.Navigator>
    );
};

export default RootNavigator;
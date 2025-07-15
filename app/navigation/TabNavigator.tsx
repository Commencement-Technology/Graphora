// navigation/TabNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

import WriteStoryScreen from '../screens/WriteStoryScreen';
import HomeStackNavigator from './HomeStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import SearchStackNavigator from './SearchStackNavigator'; // ✅ NEW

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    const { theme } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.textLight,
                tabBarShowLabel: false,
                tabBarStyle: {
                    height: 60,
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: theme.shadowColor || '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 5,
                    backgroundColor: theme.card,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeStackNavigator}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="home-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Search"
                component={SearchStackNavigator} // ✅ use Stack not single screen
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="search-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Write"
                component={WriteStoryScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="create-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileStack"
                component={ProfileStackNavigator}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="person-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

export default TabNavigator;

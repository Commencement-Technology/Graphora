// app/navigation/HomeStackNavigator.tsx (No changes needed, it's correct as is)
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import HomeScreen from '../screens/HomeScreen';
import StoryDetailScreen from '../screens/StoryDetailScreen';

const Stack = createNativeStackNavigator();

const HomeStackNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* The name 'HomeFeed' is the important detail here! */}
            <Stack.Screen name="HomeFeed" component={HomeScreen} />
            <Stack.Screen name="StoryDetail" component={StoryDetailScreen} />
        </Stack.Navigator>
    );
};

export default HomeStackNavigator;
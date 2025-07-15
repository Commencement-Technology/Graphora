// app/navigation/ProfileStackNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import EditProfileScreen from '../screens/EditProfileScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen'; // Assuming you have or will create this
import StoryDetailScreen from '../screens/StoryDetailScreen'; // Will create this next
import WriteStoryScreen from '../screens/WriteStoryScreen';
// Define the stack navigator's params
export type ProfileStackParamList = {
    Profile: undefined;
    StoryDetail: { storyId: string };
    Settings: undefined; // Make sure Settings is also part of this stack if navigated from Profile
    EditProfile: undefined
    Write: undefined
};

const ProfileStack = createStackNavigator<ProfileStackParamList>();

const ProfileStackNavigator = () => {
    return (
        <ProfileStack.Navigator
            screenOptions={{
                headerShown: false, // We'll handle custom headers inside screens if needed
            }}
            initialRouteName="Profile" // This makes ProfileScreen the default when the tab is active
        >
            <ProfileStack.Screen name="Profile" component={ProfileScreen} />
            <ProfileStack.Screen name="StoryDetail" component={StoryDetailScreen} />
            <ProfileStack.Screen name="Settings" component={SettingsScreen} />
            <ProfileStack.Screen name='EditProfile' component={EditProfileScreen} />
            <ProfileStack.Screen name='Write' component={WriteStoryScreen} />

            {/* Add any other screens that should be accessible from the Profile tab and stack on top */}
        </ProfileStack.Navigator>
    );
};

export default ProfileStackNavigator;
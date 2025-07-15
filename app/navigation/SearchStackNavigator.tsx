// navigation/SearchStackNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import SearchScreen from '../screens/SearchScreen';

export type SearchStackParamList = {
    Search: undefined;
    ProfileDetail: { userId: string };
};

const Stack = createStackNavigator<SearchStackParamList>();

const SearchStackNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
        </Stack.Navigator>
    );
};

export default SearchStackNavigator;

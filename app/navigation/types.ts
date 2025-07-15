import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

// Profile Stack (used in Profile tab)
export type ProfileStackParamList = {
  Profile: undefined;
  ProfileDetail: { userId: string };     // ✅ add this line
  StoryDetail: { storyId: string };
};


// Tab Navigator
export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Write: undefined;
  ProfileStack: NavigatorScreenParams<ProfileStackParamList>;
};

// Root Stack (switching tabs or auth)
export type RootStackParamList = {
  AppTabs: NavigatorScreenParams<TabParamList>;
  Login: undefined;
  Register: undefined;
};

// Combined navigation type for ProfileScreen
export type ProfileScreenNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'ProfileStack'>,
  StackNavigationProp<ProfileStackParamList, 'Profile'>
>;


// navigation/types.ts

export type SearchStackParamList = {
  Search: undefined;
  ProfileDetail: { userId: string };
};

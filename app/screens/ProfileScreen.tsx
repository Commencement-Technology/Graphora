// app/screens/ProfileScreen.tsx

import { onAuthStateChanged } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack'; // Use StackNavigationProp for clearer type
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions, // Import Dimensions for dynamic styling
    FlatList,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
// Firebase imports for user data and posts
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    orderBy,
    query,
    where
} from '@react-native-firebase/firestore';

// Get screen width for dynamic grid item sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 4) / 3; // 3 columns with 2px margin between them (0.5 margin on each side of item means 1px total between)

// Define the RootStackParamList if it's not already globally defined
// This ensures type safety for navigation.
type RootStackParamList = {
    Home: undefined;
    StoryDetail: { postId: string }; // Changed from 'storyId' to 'postId'
    Write: undefined; // Assuming 'Write' refers to this screen
    Settings: undefined;
    EditProfile: undefined; // Added for the button navigation
    // Add other screens in your ProfileStack or AppStack here
};

// Use StackNavigationProp for your Profile screen's navigation prop type
// Assuming ProfileScreen is part of a stack that can navigate to 'Home', 'StoryDetail', 'Settings', 'EditProfile', 'WriteStory'
type ProfileScreenNavProp = StackNavigationProp<RootStackParamList, 'Home'>; // Or whatever screen ProfileScreen itself is defined as in RootStackParamList if it's directly in it, e.g., 'Profile'

// --- UPDATED: Post interface to match your current Firestore 'posts' collection ---
interface ImageURLObject {
    public_id: string;
    secure_url: string;
}

interface Post {
    id: string;
    caption: string;
    imageURLs: ImageURLObject[]; // Array of image objects
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: { toDate: () => Date }; // Firestore Timestamp type
    audioURL?: string;
    likesCount: number;
    commentsCount: number;
    tags?: string[];
    category?: string;
}

const app = getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

const ProfileScreen = () => {
    const navigation = useNavigation<ProfileScreenNavProp>();
    const { theme } = useTheme();

    const currentUser = auth.currentUser;
    // Renamed from userStories to userPosts for clarity
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);

    const [profileData, setProfileData] = useState<{
        name: string;
        bio: string;
        picUrl: string | null;
    } | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // --- EFFECT TO FETCH USER PROFILE DATA ---
    const fetchUserProfile = async () => {
        if (!auth.currentUser) {
            setProfileData({
                name: 'Guest User',
                bio: 'Log in to share your posts!',
                picUrl: null
            });
            setIsLoadingProfile(false);
            return;
        }

        try {
            const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                setProfileData({
                    name: userData?.userName || auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User',
                    bio: userData?.bio || 'Welcome to my creative space!',
                    picUrl: userData?.profileImageURL || null,
                });
            } else {
                setProfileData({
                    name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User',
                    bio: 'Share your journey here!',
                    picUrl: auth.currentUser.photoURL || null,
                });
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            Alert.alert('Error', 'Failed to load profile data.');
            setProfileData({
                name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User',
                bio: 'An error occurred loading bio.',
                picUrl: auth.currentUser.photoURL || null,
            });
        } finally {
            setIsLoadingProfile(false);
        }
    };

    // ✅ Corrected effect
    useEffect(() => {
        fetchUserProfile();

        const unsubscribe = onAuthStateChanged(auth, () => {
            fetchUserProfile();
        });

        return () => unsubscribe();
    }, []);


    // --- EFFECT TO FETCH USER POSTS ---
    useEffect(() => {
        const fetchUserPosts = async () => {
            if (!currentUser) {
                setIsLoadingPosts(false);
                return;
            }
            try {
                // ⭐ CRUCIAL CHANGE: Fetch from 'posts' collection instead of 'stories'
                const q = query(
                    collection(firestore, 'posts'),
                    where('authorId', '==', currentUser.uid),
                    orderBy('createdAt', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const posts: Post[] = []; // Changed to Post[]
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    posts.push({
                        id: doc.id,
                        caption: data.caption || '',
                        // ⭐ CRUCIAL CHANGE: Correctly parse imageURLs
                        imageURLs: (data.imageURLs || []).map((img: any) => ({
                            public_id: img.public_id,
                            secure_url: img.secure_url,
                        })),
                        authorId: data.authorId || 'anonymous',
                        authorName: data.authorName || 'Unknown Artist',
                        authorAvatar: data.authorAvatar || undefined,
                        createdAt: data.createdAt,
                        audioURL: data.audioURL,
                        likesCount: data.likesCount || 0,
                        commentsCount: data.commentsCount || 0,
                        tags: data.tags || [],
                        category: data.category || 'General',
                    });
                });
                setUserPosts(posts);
            } catch (error) {
                console.error("Error fetching user posts:", error);
                Alert.alert('Error', 'Failed to load your posts.');
            } finally {
                setIsLoadingPosts(false);
            }
        };

        // Re-fetch posts every time the screen comes into focus
        const unsubscribeFocus = navigation.addListener('focus', () => {
            fetchUserPosts();
        });

        // Initial fetch when component mounts
        fetchUserPosts();

        // Clean up listener
        return unsubscribeFocus;
    }, [currentUser, navigation]); // Add navigation to dependencies for the listener

    // ⭐ CRUCIAL CHANGE: Render Post Grid Item
    const renderPostGridItem = ({ item }: { item: Post }) => {
        // Safely get the first image URL from the imageURLs array
        const displayImage =
            item.imageURLs && item.imageURLs.length > 0 && typeof item.imageURLs[0].secure_url === 'string'
                ? item.imageURLs[0].secure_url
                : 'https://via.placeholder.com/150/6C63FF/FFFFFF?text=Post'; // Fallback placeholder

        return (
            <TouchableOpacity
                style={styles.postGridItem}
                onPress={() => navigation.navigate('StoryDetail', { postId: item.id })} // Pass postId
            >
                <Image
                    source={{ uri: displayImage }}
                    style={styles.postGridImage}
                    resizeMode="cover"
                />
            </TouchableOpacity>
        );
    };

    // Display loading indicator for profile and posts
    if (isLoadingProfile || isLoadingPosts) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textLight }]}>Loading profile...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.borderColor }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {profileData?.name || 'Profile'}
                </Text>
                <TouchableOpacity
                    style={styles.settingsIcon}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <Icon name="settings-outline" size={26} color={theme.text} />
                </TouchableOpacity>
            </View>


            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {/* Profile Summary Section */}
                <View style={styles.profileSummary}>
                    <View style={[styles.profilePicContainer, { borderColor: theme.borderColor }]}>
                        <Image
                            source={{
                                uri: profileData?.picUrl || 'https://i.ibb.co/VvZQ0B7/default-avatar.png' // More neutral default avatar
                            }}
                            style={styles.profilePic}
                            resizeMode="cover"
                        />
                    </View>
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.text }]}>{userPosts.length}</Text>
                            <Text style={[styles.statLabel, { color: theme.textLight }]}>Posts</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.text }]}>0</Text>
                            <Text style={[styles.statLabel, { color: theme.textLight }]}>Followers</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.text }]}>0</Text>
                            <Text style={[styles.statLabel, { color: theme.textLight }]}>Following</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bioSection}>
                    <Text style={[styles.userName, { color: theme.text }]}>{profileData?.name || 'User'}</Text>
                    <Text style={[styles.userBio, { color: theme.textLight }]}>{profileData?.bio || 'No bio yet. Tap "Edit Profile" to add one!'}</Text>
                </View>

                {/* Edit Profile Button */}
                {/* Edit Profile Button */}
                {currentUser && ( // Only show edit profile if logged in
                    <TouchableOpacity
                        style={[styles.editProfileButton, { borderColor: theme.borderColor, backgroundColor: theme.card }]}
                        onPress={() => navigation.navigate('EditProfile')}
                    >
                        <Text style={[styles.editProfileButtonText, { color: theme.text }]}>
                            Edit Profile
                        </Text>
                    </TouchableOpacity>
                )}



                {/* Content Tabs */}
                <View style={[styles.tabsContainer, { borderBottomColor: theme.borderColor }]}>
                    <TouchableOpacity style={[styles.tab, { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}>
                        <Icon name="grid-outline" size={24} color={theme.primary} />
                    </TouchableOpacity>
                    {/* Add more tabs here if needed (e.g., saved posts, liked posts) */}
                    {/* <TouchableOpacity style={styles.tab}>
                        <Icon name="heart-outline" size={24} color={theme.textLight} />
                    </TouchableOpacity> */}
                </View>

                {/* Posts Grid */}
                {userPosts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyStateText, { color: theme.textLight }]}>
                            {currentUser ? "You haven't published any posts yet." : "Log in to see your posts here."}
                        </Text>
                        {currentUser ? (
                            <TouchableOpacity onPress={() => navigation.navigate('Write')}>
                                <Text style={[styles.emptyStateLink, { color: theme.primary }]}>
                                    Create your first post! ✍️
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => Alert.alert('Login', 'Navigate to login screen.')}>
                                <Text style={[styles.emptyStateLink, { color: theme.primary }]}>
                                    Login or Sign Up
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={userPosts}
                        renderItem={renderPostGridItem} // Changed to renderPostGridItem
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        scrollEnabled={false} // Important: nested FlatList in ScrollView
                        contentContainerStyle={styles.postGrid} // Changed to postGrid
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileScreen;

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
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingTop: 50, // Adjust for status bar/notch on iOS
        paddingBottom: 15,
        borderBottomWidth: 0.5,
        position: 'relative', // Needed for absolute positioning of settings icon
    },
    headerTitle: {
        fontSize: 20, // Slightly larger title
        fontWeight: 'bold', // More prominent
    },
    settingsIcon: {
        position: 'absolute',
        top: 50, // Align with headerTitle
        right: 15,
        padding: 5,
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    profileSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 25, // More vertical padding
        justifyContent: 'space-between',
    },
    profilePicContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 2,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profilePic: {
        width: '100%',
        height: '100%',
    },
    statsContainer: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'space-around',
        marginLeft: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20, // Larger numbers
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 14, // Consistent font size
    },
    bioSection: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    userName: {
        fontSize: 18, // More prominent name
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userBio: {
        fontSize: 14,
        lineHeight: 20,
    },
    editProfileButton: {
        marginHorizontal: 20,
        paddingVertical: 12, // More padding
        borderWidth: 1,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    editProfileButtonText: {
        fontSize: 16, // Larger text
        fontWeight: '600',
        // ⭐ CRUCIAL FIX: Color is now dynamically set to theme.text for proper contrast
        // In light mode, theme.text will be a dark color. In dark mode, it will be light.
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderBottomWidth: 0.5,
        marginBottom: 1,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        // Add active tab styling here if you have multiple tabs
    },
    postGrid: { // Renamed from storyGrid
        paddingHorizontal: 1, // Small horizontal padding to align items correctly
    },
    postGridItem: { // Renamed from storyGridItem
        width: GRID_ITEM_SIZE,
        height: GRID_ITEM_SIZE,
        margin: 1, // Consistent margin between items
        overflow: 'hidden',
    },
    postGridImage: { // Renamed from storyGridImage
        width: '100%',
        height: '100%',
    },
    loadingIndicator: { // This style wasn't used, kept for completeness but can be removed
        marginTop: 50,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50,
        paddingHorizontal: 20,
    },
    emptyStateText: {
        fontSize: 16,
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyStateLink: {
        fontSize: 16,
        fontWeight: '600',
    },
});
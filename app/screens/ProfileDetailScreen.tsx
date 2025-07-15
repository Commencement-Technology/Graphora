// ProfileDetailScreen.tsx

import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import {
    collection,
    doc,
    FirebaseFirestoreTypes,
    getDoc,
    getDocs,
    getFirestore,
    orderBy,
    query,
    where
} from '@react-native-firebase/firestore';
import { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import type { AppTabsParamList, ProfileStackParamList, RootStackParamList } from '../navigation/types';

const app = getApp();
const firestore = getFirestore(app);
const auth = getAuth(app);

type CombinedStackParamList = ProfileStackParamList & RootStackParamList & AppTabsParamList;
type ProfileDetailScreenNavigationProp = StackNavigationProp<CombinedStackParamList, 'ProfileDetail'>;
type ProfileDetailRouteProp = RouteProp<CombinedStackParamList, 'ProfileDetail'>;

type Props = {
    navigation: ProfileDetailScreenNavigationProp;
    route: ProfileDetailRouteProp;
};

interface UserProfile {
    uid: string;
    userName: string;
    bio: string;
    profileImageURL: string;
}

interface UserPost {
    id: string;
    imageURLs: { public_id: string; secure_url: string }[];
    caption?: string;
    createdAt?: FirebaseFirestoreTypes.Timestamp;
}

const ProfileDetailScreen: React.FC<Props> = ({ navigation, route }) => {
    const { userId } = route.params;
    const { theme } = useTheme();
    const currentUserId = auth.currentUser?.uid;

    const [viewedUserProfile, setViewedUserProfile] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [viewedUserPosts, setViewedUserPosts] = useState<UserPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);

    const DEFAULT_AVATAR_URL = 'https://i.ibb.co/VvZQ0B7/default-avatar.png';

    useEffect(() => {
        const fetchViewedUserProfile = async () => {
            if (!userId) {
                Alert.alert('Error', 'User ID is missing.');
                navigation.goBack();
                return;
            }

            try {
                const userDocRef = doc(firestore, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setViewedUserProfile({
                        uid: userId,
                        userName: userData?.userName || 'Unnamed User',
                        bio: userData?.bio || 'No bio available yet.',
                        profileImageURL: userData?.profileImageURL || DEFAULT_AVATAR_URL,
                    });
                } else {
                    Alert.alert('User Not Found', 'The user you are looking for does not exist.');
                    navigation.goBack();
                }
            } catch (error) {
                console.error("Error fetching viewed user profile:", error);
                Alert.alert('Profile Error', 'Failed to load user profile data.');
                navigation.goBack();
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchViewedUserProfile();
    }, [userId, navigation]);

    useEffect(() => {
        const fetchViewedUserPosts = async () => {
            if (!userId) {
                setIsLoadingPosts(false);
                return;
            }

            try {
                const q = query(
                    collection(firestore, 'posts'),
                    where('authorId', '==', userId),
                    orderBy('createdAt', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const posts: UserPost[] = [];

                querySnapshot.forEach((docSnap) => {
                    const postData = docSnap.data();
                    posts.push({
                        id: docSnap.id,
                        imageURLs: (postData?.imageURLs || []).map((img: any) => ({
                            public_id: img.public_id,
                            secure_url: img.secure_url,
                        })),
                        caption: postData?.caption,
                        createdAt: postData?.createdAt,
                    });
                });

                setViewedUserPosts(posts);
            } catch (error) {
                console.error("Error fetching viewed user posts:", error);
                Alert.alert('Posts Error', 'Failed to load user posts.');
            } finally {
                setIsLoadingPosts(false);
            }
        };

        fetchViewedUserPosts();
    }, [userId]);

    if (isLoadingProfile || isLoadingPosts) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textLight }]}>Loading user profile...</Text>
            </SafeAreaView>
        );
    }

    if (!viewedUserProfile) return null;

    const renderPostGridItem = ({ item }: { item: UserPost }) => {
        const displayImage =
            item.imageURLs && item.imageURLs.length > 0
                ? item.imageURLs[0].secure_url
                : 'https://via.placeholder.com/150/6C63FF/FFFFFF?text=Post';

        return (
            <TouchableOpacity
                style={styles.storyGridItem}
                onPress={() =>
                    navigation.navigate('AppTabs', {
                        screen: 'Home',
                        params: { screen: 'StoryDetail', params: { postId: item.id } },
                    })
                }
            >
                <Image source={{ uri: displayImage }} style={styles.storyGridImage} resizeMode="cover" />
            </TouchableOpacity>
        );
    };

    const isCurrentUserProfile = currentUserId === userId;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={26} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {viewedUserProfile.userName}
                </Text>
                {isCurrentUserProfile ? (
                    <TouchableOpacity style={styles.headerRightButton} onPress={() => navigation.navigate('EditProfile')}>
                        <Icon name="create-outline" size={26} color={theme.primary} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.headerRightButton}
                        onPress={() => Alert.alert('Options', 'Report, Block, or Share options')}
                    >
                        <Icon name="ellipsis-vertical" size={26} color={theme.textLight} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.profileSummary}>
                    <View style={[styles.profilePicContainer, { borderColor: theme.borderColor }]}>
                        <Image
                            source={{ uri: viewedUserProfile.profileImageURL }}
                            style={styles.profilePic}
                            resizeMode="cover"
                        />
                    </View>
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.text }]}>{viewedUserPosts.length}</Text>
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
                    <Text style={[styles.userName, { color: theme.text }]}>{viewedUserProfile.userName}</Text>
                    <Text style={[styles.userBio, { color: theme.textLight }]}>{viewedUserProfile.bio}</Text>
                </View>

                {!isCurrentUserProfile && (
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.primary }]}
                            onPress={() => Alert.alert('Follow action')}
                        >
                            <Text style={styles.actionButtonText}>Follow</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                { backgroundColor: theme.card, borderColor: theme.borderColor, borderWidth: 1, marginLeft: 10 },
                            ]}
                            onPress={() => Alert.alert('Message action')}
                        >
                            <Text style={[styles.actionButtonText, { color: theme.text }]}>Message</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[styles.tabsContainer, { borderBottomColor: theme.borderColor }]}>
                    <TouchableOpacity style={styles.tab}>
                        <Icon name="grid-outline" size={24} color={theme.primary} />
                    </TouchableOpacity>
                </View>

                {viewedUserPosts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="book-outline" size={50} color={theme.textLight} />
                        <Text style={[styles.emptyStateText, { color: theme.textLight, marginTop: 10 }]}>
                            {isCurrentUserProfile
                                ? "You haven't published any posts yet."
                                : `${viewedUserProfile.userName} has no posts yet.`}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={viewedUserPosts}
                        renderItem={renderPostGridItem}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        scrollEnabled={false}
                        contentContainerStyle={styles.storyGrid}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileDetailScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
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
        paddingTop: 15,
        paddingBottom: 15,
        borderBottomWidth: 0.5,
    },
    backButton: {
        position: 'absolute',
        left: 15,
        top: 15,
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerRightButton: {
        position: 'absolute',
        right: 15,
        top: 15,
        padding: 5,
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    profileSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
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
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 13,
    },
    bioSection: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    userBio: {
        fontSize: 14,
        lineHeight: 20,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
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
    },
    storyGrid: {
        justifyContent: 'flex-start',
    },
    storyGridItem: {
        flex: 1,
        aspectRatio: 1,
        margin: 0.5,
        overflow: 'hidden',
    },
    storyGridImage: {
        width: '100%',
        height: '100%',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50,
        paddingHorizontal: 20,
    },
    emptyStateText: {
        fontSize: 16,
        textAlign: 'center',
    },
});

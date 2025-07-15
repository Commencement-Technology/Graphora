import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

import { getApp } from '@react-native-firebase/app';
import { collection, getDocs, getFirestore, orderBy, query } from '@react-native-firebase/firestore';

// --- NEW: Define the ImageURLObject interface for clarity ---
interface ImageURLObject {
    public_id: string;
    secure_url: string;
}

// --- UPDATED: Define the Post interface to match your Firestore 'posts' collection ---
interface Post {
    id: string;
    caption: string;
    imageURLs: ImageURLObject[]; // <--- Changed to array of ImageURLObject
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: { toDate: () => Date };
    audioURL?: string;
    likesCount: number;
    commentsCount: number;
    tags?: string[];
    category?: string;
    // Add other fields as needed
}

// --- NEW: Define the RootStackParamList for updated navigation ---
type RootStackParamList = {
    Home: undefined;
    StoryDetail: { postId: string };
    WriteStory: undefined;
    // Add any other screens you have in your navigator
};

const HomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
    const { theme } = useTheme();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    // --- NEW: Simplified data fetching for 'posts' ---
    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            const app = getApp();
            const firestore = getFirestore(app);

            const q = query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            const fetchedPosts: Post[] = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                fetchedPosts.push({
                    id: doc.id,
                    caption: data.caption || '',
                    // ⭐ CORRECTION: Ensure imageURLs are properly typed when fetched
                    // Firestore data.imageURLs is an array of objects, cast it directly
                    imageURLs: (data.imageURLs as ImageURLObject[]) || [],
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
            setPosts(fetchedPosts);

        } catch (error) {
            console.error('[Firestore] Error fetching posts:', error);
            Alert.alert('Error', 'Failed to load posts. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // --- Effect Hook for Initial Load and Re-fetching on Focus ---
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await fetchPosts();
        };

        const unsubscribe = navigation.addListener('focus', () => {
            loadInitialData();
        });

        loadInitialData();

        return unsubscribe;
    }, [navigation, fetchPosts]);


    // --- NEW: Render Item for FlatList (Post Card) ---
    const renderPostItem = ({ item }: { item: Post }) => {
        const formattedDate = item.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }) || 'N/A';

        // ⭐ CORRECTION: Access the secure_url property from the object
        const displayImage = (
            item.imageURLs &&
            item.imageURLs.length > 0 &&
            item.imageURLs[0] &&
            typeof item.imageURLs[0].secure_url === 'string'
        ) ? item.imageURLs[0].secure_url : null; // Access the .secure_url property

        return (
            <TouchableOpacity
                style={[styles.postCard, { backgroundColor: theme.card }]}
                onPress={() => navigation.navigate('StoryDetail', { postId: item.id })}
                activeOpacity={0.8}
            >
                {/* Post Header (Author Info) */}
                <View style={styles.cardHeader}>
                    {item.authorAvatar ? (
                        <Image source={{ uri: item.authorAvatar }} style={styles.authorAvatar} />
                    ) : (
                        <View style={[styles.authorAvatarPlaceholder, { backgroundColor: theme.textLight + '30' }]} />
                    )}
                    <View>
                        <Text style={[styles.authorName, { color: theme.text }]}>{item.authorName}</Text>
                        <Text style={[styles.postTime, { color: theme.textLight }]}>{formattedDate}</Text>
                    </View>
                </View>

                {/* Post Image (display the first image from the array) */}
                {displayImage ? (
                    <Image source={{ uri: displayImage }} style={styles.postImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.postImagePlaceholder, { backgroundColor: theme.cardBackground }]}>
                        <Text style={{ color: theme.textLight }}>No Image</Text>
                    </View>
                )}

                {/* Actions Section (Like, Comment, Share) */}
                <View style={[styles.cardActions, { borderTopColor: theme.borderColor }]}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Icon name="heart-outline" size={20} color={theme.text} style={styles.actionIcon} />
                        <Text style={[styles.actionText, { color: theme.text }]}>{item.likesCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Icon name="chatbubble-outline" size={20} color={theme.text} style={styles.actionIcon} />
                        <Text style={[styles.actionText, { color: theme.text }]}>{item.commentsCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Icon name="share-social-outline" size={20} color={theme.text} style={styles.actionIcon} />
                        <Text style={[styles.actionText, { color: theme.text }]}>Share</Text>
                    </TouchableOpacity>
                </View>


                {/* Caption, Tags */}
                <View style={styles.cardContent}>
                    <Text style={[styles.captionText, { color: theme.text }]}>
                        <Text style={[styles.authorNameBold, { color: theme.text }]}>{item.authorName} </Text>
                        {item.caption}
                    </Text>

                    {item.tags && item.tags.length > 0 && (
                        <Text style={[styles.tagsText, { color: theme.accent }]}>
                            {item.tags.map(tag => `#${tag}`).join(' ')}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {loading && posts.length === 0 ? (
                <View style={styles.fullScreenLoader}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textLight }]}>Loading your feed...</Text>
                </View>
            ) : posts.length === 0 ? (
                <View style={styles.fullScreenLoader}>
                    <Text style={[styles.noPostsText, { color: theme.text }]}>No posts yet! Be the first to share your art. 🎨</Text>
                    <TouchableOpacity
                        style={[styles.writePostButton, { backgroundColor: theme.primary }]}
                        onPress={() => navigation.navigate('WriteStory')}
                    >
                        <Text style={styles.writePostButtonText}>Create Your First Post</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPostItem}
                    contentContainerStyle={styles.flatListContentContainer}
                    showsVerticalScrollIndicator={false}
                    refreshing={loading}
                    onRefresh={fetchPosts}
                />
            )}
        </View>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fullScreenLoader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    noPostsText: {
        textAlign: 'center',
        fontSize: 18,
        marginBottom: 20,
        fontWeight: '500',
    },
    writePostButton: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        marginTop: 20,
        elevation: 2,
    },
    writePostButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    flatListContentContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
    },
    postCard: {
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingBottom: 8,
    },
    authorAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#e0e0e0',
    },
    authorAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ccc',
        marginRight: 10,
    },
    authorName: {
        fontSize: 16,
        fontWeight: '700',
    },
    postTime: {
        fontSize: 12,
    },
    postImage: {
        width: '100%',
        height: 300,
        backgroundColor: '#e0e0e0',
    },
    postImagePlaceholder: {
        width: '100%',
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center', // Ensures icons and text are vertically aligned
        paddingVertical: 12,
        borderTopWidth: 0.5,
    },
    actionButton: {
        flexDirection: 'row', // Important: icon and text side by side
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
    },
    actionIcon: {
        marginRight: 6, // Space between icon and text
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },

    cardContent: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 12,
    },
    captionText: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 4,
    },
    authorNameBold: {
        fontWeight: 'bold',
    },
    tagsText: {
        fontSize: 13,
        marginTop: 4,
        fontStyle: 'italic',
    },


});
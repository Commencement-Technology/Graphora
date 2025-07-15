import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext'; // Ensure this path is correct

import { getApp } from '@react-native-firebase/app';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';

// Get screen width for image carousel
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- UPDATED: Post interface to match your current Firestore 'posts' collection ---
interface ImageURLObject {
    public_id: string;
    secure_url: string;
}

interface Post {
    id: string;
    caption: string; // From Firestore: 'caption'
    imageURLs: ImageURLObject[]; // From Firestore: array of objects { public_id, secure_url }
    authorId: string;
    authorName: string; // Embedded in post document
    authorAvatar?: string; // Embedded in post document
    createdAt: { toDate: () => Date }; // Firestore Timestamp type
    audioURL?: string;
    likesCount: number;
    commentsCount: number;
    tags?: string[];
    category?: string;
}

// --- UPDATED: RouteParams type to match HomeScreen's navigation ---
// HomeScreen passes { postId: item.id } to StoryDetail
type RootStackParamList = {
    Home: undefined;
    StoryDetail: { postId: string }; // We now expect only postId
};

const audioPlayer = new AudioRecorderPlayer();

const StoryDetailScreen = () => {
    const route = useRoute<RouteProp<RootStackParamList, 'StoryDetail'>>();
    const { theme } = useTheme();

    const [post, setPost] = useState<Post | null>(null); // Renamed from 'story' to 'post'
    const [loadingPost, setLoadingPost] = useState(true); // Renamed from 'loadingStory'

    const [isPlaying, setIsPlaying] = useState(false);
    const [playTime, setPlayTime] = useState('00:00');
    const [duration, setDuration] = useState('00:00');
    const [loadingAudio, setLoadingAudio] = useState(false);

    // Image carousel state
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    const postId = route.params.postId; // Get postId directly

    // --- Fetch Post by ID ---
    useEffect(() => {
        const fetchPostById = async (id: string) => {
            try {
                setLoadingPost(true);
                const app = getApp();
                const firestore = getFirestore(app);
                const docRef = doc(firestore, 'posts', id); // Fetch from 'posts' collection
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data) {
                        const fetchedPost: Post = {
                            id: docSnap.id,
                            caption: data.caption || '',
                            // Map imageURLs to extract just the secure_url string
                            imageURLs: (data.imageURLs || []).map((img: any) => ({
                                public_id: img.public_id,
                                secure_url: img.secure_url,
                            })),
                            authorId: data.authorId || 'anonymous',
                            authorName: data.authorName || 'Unknown Artist', // Embedded
                            authorAvatar: data.authorAvatar || undefined, // Embedded
                            createdAt: data.createdAt, // Keep as Timestamp to format later
                            audioURL: data.audioURL,
                            likesCount: data.likesCount || 0,
                            commentsCount: data.commentsCount || 0,
                            tags: data.tags || [],
                            category: data.category || 'General',
                        };
                        setPost(fetchedPost);
                    } else {
                        Alert.alert('Error', 'Post data is missing.');
                    }
                } else {
                    Alert.alert('Error', 'Post not found.');
                }
            } catch (err) {
                console.error('Error loading post by ID:', err);
                Alert.alert('Error', 'Failed to load post.');
            } finally {
                setLoadingPost(false);
            }
        };

        if (postId) {
            fetchPostById(postId);
        } else {
            setLoadingPost(false); // No postId means nothing to load
            Alert.alert('Error', 'No post ID provided.');
        }

        // Cleanup audio player when component unmounts or post changes
        return () => {
            handleStop(); // Stop any playing audio
        };
    }, [postId]); // Depend on postId

    // --- Audio Player Handlers ---
    const handlePlay = async () => {
        if (!post?.audioURL) {
            Alert.alert('No Audio', 'This post does not have an audio note.');
            return;
        }
        setLoadingAudio(true);
        try {
            if (isPlaying) {
                await audioPlayer.stopPlayer();
                audioPlayer.removePlayBackListener();
            }

            await audioPlayer.startPlayer(post.audioURL);
            setIsPlaying(true);
            setLoadingAudio(false);

            audioPlayer.addPlayBackListener((e) => {
                setPlayTime(audioPlayer.mmssss(Math.floor(e.currentPosition)));
                setDuration(audioPlayer.mmssss(Math.floor(e.duration)));
                if (e.currentPosition >= e.duration) handleStop();
            });
        } catch (err: any) {
            setLoadingAudio(false);
            setIsPlaying(false);
            console.error('Audio error:', err);
            Alert.alert('Playback Error', err.message || 'Audio playback failed.');
        }
    };

    const handleStop = async () => {
        try {
            await audioPlayer.stopPlayer();
            audioPlayer.removePlayBackListener();
            setIsPlaying(false);
            setPlayTime('00:00');
        } catch (err) {
            console.error('Stop playback error:', err);
        }
    };

    const handlePause = async () => {
        try {
            await audioPlayer.pausePlayer();
            setIsPlaying(false);
        } catch (err) {
            console.error('Pause error:', err);
        }
    };

    // Handle image carousel scrolling
    const handleScroll = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / SCREEN_WIDTH);
        setActiveImageIndex(index);
    };

    // --- Loading State ---
    if (loadingPost || !post) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ marginTop: 10, color: theme.textLight }}>Loading post details...</Text>
            </View>
        );
    }

    // Format creation date
    const formattedDate = post.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }) || 'N/A';


    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.postDetailCard, { backgroundColor: theme.card }]}>
                {/* Image Carousel */}
                {post.imageURLs && post.imageURLs.length > 0 ? (
                    <>
                        <ScrollView
                            ref={scrollViewRef}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={handleScroll}
                            scrollEventThrottle={16}
                            style={styles.imageCarousel}
                        >
                            {post.imageURLs.map((imgObj, index) => (
                                <Image
                                    key={imgObj.public_id || index} // Use public_id as key, fallback to index
                                    source={{ uri: imgObj.secure_url }} // Access secure_url
                                    style={styles.carouselImage}
                                    resizeMode="cover"
                                />
                            ))}
                        </ScrollView>
                        {post.imageURLs.length > 1 && (
                            <View style={styles.paginationDots}>
                                {post.imageURLs.map((_, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.dot,
                                            { backgroundColor: activeImageIndex === index ? theme.primary : theme.textLight + '50' },
                                        ]}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    <View style={[styles.postImagePlaceholder, { backgroundColor: theme.cardBackground }]}>
                        <Text style={{ color: theme.textLight }}>No Image Available</Text>
                    </View>
                )}

                <View style={styles.textContainer}>
                    <Text style={[styles.caption, { color: theme.text }]}>{post.caption}</Text>

                    {/* Author Section */}
                    <View style={styles.authorMetaContainer}>
                        {post.authorAvatar ? (
                            <Image source={{ uri: post.authorAvatar }} style={styles.authorAvatar} />
                        ) : (
                            <View style={[styles.authorAvatarPlaceholder, { backgroundColor: theme.textLight + '30' }]} />
                        )}
                        <View>
                            <Text style={[styles.authorName, { color: theme.text }]}>By {post.authorName}</Text>
                            <Text style={[styles.postTime, { color: theme.textLight }]}>{formattedDate}</Text>
                        </View>
                    </View>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            <Text style={[styles.tagsLabel, { color: theme.textLight }]}>Tags: </Text>
                            <Text style={[styles.tagsText, { color: theme.accent }]}>
                                {post.tags.map(tag => `#${tag}`).join(' ')}
                            </Text>
                        </View>
                    )}

                    {/* Category (Optional) */}
                    {post.category && (
                        <View style={styles.categoryContainer}>
                            <Text style={[styles.categoryLabel, { color: theme.textLight }]}>Category: </Text>
                            <Text style={[styles.categoryText, { color: theme.accent }]}>{post.category}</Text>
                        </View>
                    )}

                    {/* Likes and Comments Count */}
                    <View style={styles.socialStats}>
                        <View style={styles.socialItem}>
                            <Icon name="heart-outline" size={16} color={theme.textLight} style={styles.socialIcon} />
                            <Text style={[styles.socialText, { color: theme.textLight }]}>
                                {post.likesCount} Likes
                            </Text>
                        </View>
                        <View style={styles.socialItem}>
                            <Icon name="chatbubble-outline" size={16} color={theme.textLight} style={styles.socialIcon} />
                            <Text style={[styles.socialText, { color: theme.textLight }]}>
                                {post.commentsCount} Comments
                            </Text>
                        </View>
                    </View>

                </View>

                {/* Audio Player */}
                {post.audioURL && (
                    <View style={[styles.audioPlayerBox, { borderTopColor: theme.borderColor }]}>
                        <Text style={[styles.audioLabel, { color: theme.text }]}>🔊 Voice Note</Text>
                        <View style={styles.audioControls}>
                            <TouchableOpacity
                                onPress={isPlaying ? handlePause : handlePlay}
                                style={[
                                    styles.audioButton,
                                    { backgroundColor: isPlaying ? theme.accent : theme.primary },
                                ]}
                                disabled={loadingAudio}
                            >
                                {loadingAudio ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.audioButtonText}>{isPlaying ? 'Pause' : 'Play Audio'}</Text>
                                )}
                            </TouchableOpacity>
                            {isPlaying && (
                                <TouchableOpacity
                                    onPress={handleStop}
                                    style={[styles.audioButton, { backgroundColor: theme.error, marginLeft: 10 }]} // Use theme.error
                                >
                                    <Text style={styles.audioButtonText}>Stop</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={[styles.audioTime, { color: theme.textLight }]}>
                            {playTime} / {duration}
                        </Text>
                    </View>
                )}
            </View>
            <View style={{ height: 50 }} />{/* Spacer for bottom */}
        </ScrollView>
    );
};

export default StoryDetailScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    postDetailCard: {
        marginVertical: 12, // More margin at top/bottom
        marginHorizontal: 16,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    // Image Carousel Styles
    imageCarousel: {
        width: SCREEN_WIDTH - 32, // Card width minus horizontal margins
        height: 300, // Fixed height for carousel images
    },
    carouselImage: {
        width: SCREEN_WIDTH - 32, // Each image takes full carousel width
        height: '100%',
    },
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.1)', // Slight overlay for dots
        position: 'absolute', // Position over the image
        bottom: 0,
        width: '100%',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    postImagePlaceholder: {
        width: '100%',
        height: 200, // Increased placeholder height for better visual balance
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        padding: 20,
    },
    caption: { // Renamed from 'title' to 'caption'
        fontSize: 22, // Slightly smaller for caption, more natural
        fontWeight: 'bold',
        marginBottom: 10,
    },
    // Removed old 'title' and 'content' styles as they are replaced by 'caption'
    authorMetaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15, // Reduced margin
        paddingBottom: 15,
        borderBottomWidth: 0.5, // Add a separator
        borderColor: '#e0e0e0', // Light border
    },
    authorAvatar: {
        width: 45, // Slightly larger avatar
        height: 45,
        borderRadius: 22.5,
        marginRight: 12,
        backgroundColor: '#e0e0e0',
    },
    authorAvatarPlaceholder: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#ccc',
        marginRight: 12,
    },
    authorName: {
        fontSize: 17, // Slightly larger font
        fontWeight: '700',
    },
    postTime: {
        fontSize: 13, // Consistent with HomeScreen
    },
    content: { // This style is for the actual caption/body text
        fontSize: 16, // Adjusted for readability
        lineHeight: 25,
        marginBottom: 20,
        textAlign: 'justify', // Justify text for better appearance
    },
    tagsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tagsLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    tagsText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
    },


    audioPlayerBox: {
        padding: 20,
        borderTopWidth: 0.5, // Consistent border width
        alignItems: 'center',
        borderColor: '#e0e0e0', // Light border
    },
    audioLabel: {
        fontSize: 18,
        marginBottom: 15,
        fontWeight: '600',
    },
    audioControls: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    audioButton: {
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 10,
        minWidth: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    audioTime: {
        fontSize: 14,
        marginTop: 5,
    }, socialStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 10,
    },
    socialItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
    },
    socialIcon: {
        marginRight: 4,
    },
    socialText: {
        fontSize: 13,
    },

});
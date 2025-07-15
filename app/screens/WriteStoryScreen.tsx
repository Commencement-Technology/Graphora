import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import {
    addDoc,
    collection,
    getFirestore,
    serverTimestamp,
} from '@react-native-firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../context/ThemeContext'; // Assuming this path is correct
import { uploadToCloudinary } from '../utils/uploadToCloudinary'; // Assuming this path is correct

// Initialize Firebase
const app = getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

const MAX_IMAGES = 10; // Maximum number of images allowed per post

const WriteStoryScreen = () => {
    const { theme } = useTheme();
    const [caption, setCaption] = useState('');
    const [tags, setTags] = useState(''); // State for comma-separated tags
    const [category, setCategory] = useState(''); // State for post category
    const [images, setImages] = useState<{ uri: string; type: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    /**
     * Handles selecting images from the device's library.
     * Allows multiple selections up to MAX_IMAGES.
     */
    const handleSelectImages = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: MAX_IMAGES - images.length, // Limit selection to remaining slots
                quality: 0.8,
                includeBase64: false, // Generally prefer URI for direct upload
            });

            if (result.didCancel) {
                console.log('User cancelled image picker');
                return;
            }
            if (result.errorCode) {
                console.error('ImagePicker Error: ', result.errorMessage);
                Alert.alert('Error', 'Failed to select images: ' + result.errorMessage);
                return;
            }

            const newImages =
                result.assets
                    ?.filter((asset) => asset.uri && asset.type)
                    .map((asset) => ({ uri: asset.uri!, type: asset.type! })) || [];

            setImages((prevImages) => {
                const combined = [...prevImages, ...newImages];
                // Ensure we don't exceed MAX_IMAGES even if platform allows more initially
                if (combined.length > MAX_IMAGES) {
                    Alert.alert(
                        `Max Images Reached`,
                        `You can upload a maximum of ${MAX_IMAGES} images per post. Only the first ${MAX_IMAGES} selected will be used.`
                    );
                    return combined.slice(0, MAX_IMAGES);
                }
                return combined;
            });
        } catch (err) {
            console.error('Image select error:', err);
            Alert.alert('Error', 'Failed to select images.');
        }
    };

    /**
     * Handles removing a selected image.
     */
    const handleRemoveImage = (indexToRemove: number) => {
        Alert.alert(
            'Remove Image',
            'Are you sure you want to remove this image from your post?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Remove',
                    onPress: () => {
                        setImages((prevImages) =>
                            prevImages.filter((_, index) => index !== indexToRemove)
                        );
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        );
    };

    /**
     * Handles submitting the post.
     */
    const handleSubmit = async () => {
        if (!caption.trim()) {
            Alert.alert('Missing Caption', 'Please add a caption for your post.');
            return;
        }

        if (images.length === 0) {
            Alert.alert('No Images', 'Please select at least one image to post.');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Not Logged In', 'You must be logged in to create a post.');
            return;
        }

        setIsUploading(true);

        try {
            // 1. Upload Images to Cloudinary
            const imageUploadPromises = images.map((img) =>
                uploadToCloudinary(img.uri, img.type)
            );
            const uploadedImageURLs = await Promise.all(imageUploadPromises);

            // 2. Prepare Post Data for Firestore
            const postData = {
                caption: caption.trim(),
                imageURLs: uploadedImageURLs,
                tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), // Split by comma, trim, remove empty strings
                category: category.trim() || 'General', // Default to 'General' if no category is provided
                authorId: user.uid,
                authorName: user.displayName || user.email?.split('@')[0] || 'Artist', // Prioritize displayName
                authorAvatar: user.photoURL || null, // User's profile picture
                likesCount: 0,
                commentsCount: 0,
                isMonetized: false, // Placeholder for future monetization options
                copyrightProtected: true, // Placeholder for future copyright features
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // 3. Save to Firestore (using 'posts' collection as per DCO)
            await addDoc(collection(firestore, 'posts'), postData);
            Alert.alert('Post Published!', 'Your artwork has been successfully shared.');

            // 4. Reset form fields after successful upload
            setCaption('');
            setTags('');
            setCategory('');
            setImages([]);
        } catch (error: any) {
            console.error('Post creation failed:', error, error.message);
            Alert.alert(
                'Upload Failed',
                error.message || 'An unexpected error occurred during upload. Please try again.'
            );
        } finally {
            setIsUploading(false);
        }
    };

    // Placeholder for navigation back (if using React Navigation)
    const handleCancel = () => {
        Alert.alert(
            'Discard Post?',
            'Are you sure you want to discard this post? Your changes will not be saved.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Discard',
                    onPress: () => {
                        // TODO: Implement navigation.goBack() or similar if this component is part of a stack
                        // For now, just reset the state
                        setCaption('');
                        setTags('');
                        setCategory('');
                        setImages([]);
                        // If this component is a modal, you'd dismiss it here.
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <KeyboardAvoidingView // Manages keyboard visibility for inputs
            style={[styles.fullScreen, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // 'height' works better on Android for general scrolling content
        >
            {/* Header - Instagram-like Top Bar */}
            <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={handleCancel} disabled={isUploading}>
                    <Text style={[styles.headerButtonText, { color: theme.textLight }]}>
                        Cancel
                    </Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>New Post</Text>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isUploading || images.length === 0 || !caption.trim()}
                >
                    <Text
                        style={[
                            styles.headerButtonText,
                            {
                                color:
                                    isUploading || images.length === 0 || !caption.trim()
                                        ? theme.textLight // Grey out if disabled
                                        : theme.primary, // Primary brand color when active
                                fontWeight: 'bold', // Make 'Share' stand out
                            },
                        ]}
                    >
                        Share
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled" // Prevents keyboard dismissal on tap outside input
            >
                {/* Image Selection & Preview Area */}
                <View style={styles.imageSection}>
                    {images.length === 0 ? (
                        <TouchableOpacity
                            style={[
                                styles.imagePlaceholder,
                                {
                                    backgroundColor: theme.cardBackground,
                                    borderColor: theme.borderColor,
                                },
                            ]}
                            onPress={handleSelectImages}
                            disabled={isUploading}
                        >
                            <Text style={[styles.placeholderText, { color: theme.textLight }]}>
                                Tap to select images
                            </Text>
                            <Text style={[styles.placeholderSubText, { color: theme.textLight }]}>
                                Up to {MAX_IMAGES} artworks
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.selectedImagesContainer}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.imageScroll}
                            >
                                {images.map((img, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onLongPress={() => handleRemoveImage(index)}
                                        style={styles.selectedImageWrapper}
                                        disabled={isUploading}
                                    >
                                        <Image source={{ uri: img.uri }} style={styles.selectedImage} />
                                        {/* Red "X" overlay for removal */}
                                        <TouchableOpacity
                                            onPress={() => handleRemoveImage(index)}
                                            style={styles.removeImageIcon}
                                            disabled={isUploading}
                                        >
                                            <Text style={styles.removeIconText}>✕</Text>
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))}
                                {/* "Add More" button within the horizontal scroll view */}
                                {images.length < MAX_IMAGES && (
                                    <TouchableOpacity
                                        style={[
                                            styles.addMoreImagesButton,
                                            {
                                                backgroundColor: theme.cardBackground,
                                                borderColor: theme.borderColor,
                                            },
                                        ]}
                                        onPress={handleSelectImages}
                                        disabled={isUploading}
                                    >
                                        <Text style={[styles.addMoreText, { color: theme.textLight }]}>+</Text>
                                        <Text style={[styles.addMoreTextSmall, { color: theme.textLight }]}>Add More</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* Caption Input */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Write a Caption</Text>
                    <TextInput
                        value={caption}
                        onChangeText={setCaption}
                        placeholder="Say something about your art, your inspiration, or process..."
                        placeholderTextColor={theme.placeholderTextColor}
                        multiline
                        style={[
                            styles.input,
                            {
                                color: theme.text,
                                backgroundColor: theme.inputBackground,
                                borderColor: theme.borderColor,
                            },
                        ]}
                        editable={!isUploading}
                    />
                </View>

                {/* Tags Input */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Tags (comma-separated)</Text>
                    <TextInput
                        value={tags}
                        onChangeText={setTags}
                        placeholder="e.g., #abstract, #oilpainting, #digitalart, #portrait"
                        placeholderTextColor={theme.placeholderTextColor}
                        style={[
                            styles.input,
                            {
                                color: theme.text,
                                backgroundColor: theme.inputBackground,
                                borderColor: theme.borderColor,
                                minHeight: 45, // Shorter for single line input
                            },
                        ]}
                        editable={!isUploading}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {/* Category Selection */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                    {/* For simplicity, a text input for now. Later, this could be a Picker or a modal with options. */}
                    <TextInput
                        value={category}
                        onChangeText={setCategory}
                        placeholder="e.g., Photography, Painting, Sculpture, Digital Art"
                        placeholderTextColor={theme.placeholderTextColor}
                        style={[
                            styles.input,
                            {
                                color: theme.text,
                                backgroundColor: theme.inputBackground,
                                borderColor: theme.borderColor,
                                minHeight: 45, // Shorter for single line input
                            },
                        ]}
                        editable={!isUploading}
                    />
                </View>

                {/* Monetization & Copyright Options (Placeholders for future development) */}
                <View style={styles.optionsSection}>
                    <TouchableOpacity
                        style={[styles.optionRow, { borderBottomColor: theme.borderColor }]}
                        onPress={() => Alert.alert('Coming Soon', 'Monetization options will be available here.')}
                        disabled={isUploading}
                    >
                        <Text style={[styles.optionText, { color: theme.text }]}>Monetization Options</Text>
                        <Text style={[styles.optionArrow, { color: theme.textLight }]}>&gt;</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.optionRow}
                        onPress={() => Alert.alert('Coming Soon', 'Copyright and protection settings will be available here.')}
                        disabled={isUploading}
                    >
                        <Text style={[styles.optionText, { color: theme.text }]}>Copyright & Protection</Text>
                        <Text style={[styles.optionArrow, { color: theme.textLight }]}>&gt;</Text>
                    </TouchableOpacity>
                </View>

                {/* Submit Button - Now 'Share' button in header */}
                {/* Removed the redundant bottom submit button, as 'Share' is in the header */}

            </ScrollView>

            {/* Loading Overlay */}
            {isUploading && (
                <View style={[styles.loadingOverlay, { backgroundColor: theme.card }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.text }]}>
                        Uploading your masterpiece...
                    </Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

export default WriteStoryScreen;

const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        // Theming for background and border will come from props
    },
    headerButtonText: {
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 15,
        paddingBottom: 30, // Extra padding for keyboard
    },
    // --- Image Selection Styles ---
    imageSection: {
        marginTop: 20,
        marginBottom: 20,
    },
    imagePlaceholder: {
        width: '100%',
        height: 180, // Larger placeholder for better visuals
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed', // Dotted border for a clear call to action
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 5,
    },
    placeholderSubText: {
        fontSize: 14,
    },
    selectedImagesContainer: {
        minHeight: 120, // Ensure space for horizontal scroll
    },
    imageScroll: {
        flexDirection: 'row',
        alignItems: 'center', // Align items vertically in the scroll view
        paddingVertical: 5, // Small padding around images
    },
    selectedImageWrapper: {
        width: 100, // Fixed width for each thumbnail
        height: 100, // Fixed height for each thumbnail
        borderRadius: 8,
        marginRight: 10,
        position: 'relative', // For the remove icon
    },
    selectedImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        resizeMode: 'cover', // Cover the area, similar to Instagram
    },
    removeImageIcon: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'rgba(0,0,0,0.6)', // Semi-transparent black background
        borderRadius: 15,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF', // White border for contrast
    },
    removeIconText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    addMoreImagesButton: {
        width: 100,
        height: 100,
        borderRadius: 8,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    addMoreText: {
        fontSize: 28,
        fontWeight: '200', // Lighter weight for the plus
    },
    addMoreTextSmall: {
        fontSize: 12,
    },
    // --- Input Styles ---
    inputGroup: {
        marginBottom: 15, // Spacing between input sections
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        minHeight: 100, // Default height for caption
        textAlignVertical: 'top', // For multiline TextInput
    },
    // --- Options Section Styles (Monetization/Copyright) ---
    optionsSection: {
        marginTop: 20,
        borderRadius: 10,
        overflow: 'hidden', // Ensures borders/shadows are contained
        // Background and border will come from theme.card and theme.borderColor
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: '#FFFFFF', // Use theme.card in production
        borderBottomWidth: 1,
    },
    optionText: {
        fontSize: 16,
    },
    optionArrow: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    // --- Loading Overlay Styles ---
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        // Background color will be semi-transparent from theme.card or a custom rgba
        opacity: 0.9, // Slightly transparent
        zIndex: 10, // Ensures it's on top
        borderRadius: 10, // Rounded corners for the overlay itself
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '500',
    },
});
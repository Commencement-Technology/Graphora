// app/screens/SearchScreen.tsx

import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth'; // Import getAuth
import {
    collection,
    endAt,
    getDocs,
    getFirestore,
    orderBy,
    query,
    startAt,
} from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react'; // Import useEffect
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

// Initialize Firebase App and Firestore outside the component to avoid re-initialization
const app = getApp();
const firestore = getFirestore(app);
const auth = getAuth(app); // Initialize Auth

// Define RootStackParamList (ensure this matches your main navigation types)
type RootStackParamList = {
    Search: undefined;
    ProfileDetail: { userId: string }; // Parameter name consistent with ProfileScreen/user profiles
};

type UserItem = {
    id: string;
    displayName: string;
    avatarURL?: string; // Optional avatar URL
};

const SearchScreen = () => {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Search'>>();
    const { theme } = useTheme();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null); // State to hold current user's UID

    // Get current user's UID on component mount
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setCurrentUserId(currentUser.uid);
        }
    }, []); // Empty dependency array means this runs once on mount

    // --- IMPORTANT: Firestore Index for Search ---
    // For this query to work efficiently and avoid 'failed-precondition' errors,
    // you MUST create a composite index in your Firebase Console:
    // Collection ID: 'users'
    // Fields:
    //   - userName_lowercase (Ascending)
    // You'll get a direct link in the Firebase error message if you don't have it.
    // If you don't store 'userName_lowercase', consider adding it to your user creation/update logic.
    // Alternatively, if you only store 'userName', the query should be:
    // orderBy('userName'), startAt(searchText), endAt(searchText + '\uf8ff')
    // And you'd need an index on 'userName' (Ascending).
    // For robust full-text search, consider a third-party solution like Algolia or a cloud function.

    const handleSearch = async (text: string) => {
        const searchText = text.toLowerCase().trim();
        setSearchQuery(text);

        if (searchText.length === 0) {
            setSearchResults([]);
            setIsSearching(false);
            return; // Exit early if search text is empty
        }

        setIsSearching(true);
        try {
            const usersRef = collection(firestore, 'users');

            const q = query(
                usersRef,
                // ⭐ Assumes you store a 'userName_lowercase' field for efficient search
                orderBy('userName_lowercase'),
                startAt(searchText),
                endAt(searchText + '\uf8ff')
            );

            const snapshot = await getDocs(q);

            const users: UserItem[] = snapshot.docs
                .map((doc) => ({
                    id: doc.id,
                    // ⭐ Ensure 'userName' and 'profileImageURL' are the correct field names in your 'users' collection
                    displayName: doc.data().userName || doc.data().email?.split('@')[0] || 'Unnamed User',
                    avatarURL: doc.data().profileImageURL || undefined,
                }))
                .filter(user => user.id !== currentUserId); // ⭐ Filter out the current user

            setSearchResults(users);
        } catch (error) {
            console.error('Search error:', error);
            // Optionally show an alert to the user
            // Alert.alert('Search Error', 'Failed to perform search. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
    };

    const renderUserItem = ({ item }: { item: UserItem }) => (
        <TouchableOpacity
            style={[styles.userItem, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })}
        >
            <Image
                // ⭐ Consistent default avatar from ProfileScreen for better UX
                source={{ uri: item.avatarURL || 'https://i.ibb.co/VvZQ0B7/default-avatar.png' }}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>{item.displayName}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Search Bar */}
            <View style={[styles.searchBarContainer, { backgroundColor: theme.cardBackground }]}>
                <Icon name="search-outline" size={20} color={theme.textLight} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search users..."
                    placeholderTextColor={theme.placeholderTextColor}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                        <Icon name="close-circle" size={20} color={theme.textLight} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Results Display */}
            {isSearching ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textLight }]}>Searching for users...</Text>
                </View>
            ) : (searchQuery.length > 0 && searchResults.length === 0) ? (
                <View style={styles.emptyState}>
                    <Icon name="person-remove-outline" size={50} color={theme.textLight} />
                    <Text style={[styles.emptyStateText, { color: theme.textLight, marginTop: 10 }]}>
                        No users found matching "{searchQuery}".
                    </Text>
                    <Text style={[styles.emptyStateText, { color: theme.textLight, fontSize: 14 }]}>
                        Try a different name or check your spelling.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.resultList}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        searchQuery.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="search-circle-outline" size={70} color={theme.textLight} />
                                <Text style={[styles.emptyStateText, { color: theme.textLight, marginTop: 10 }]}>
                                    Type a name in the search bar to find users.
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default SearchScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
        marginTop: 15,
        marginBottom: 10,
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
    },
    clearButton: {
        marginLeft: 10,
        padding: 5,
    },
    resultList: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 2,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 17,
        fontWeight: 'bold',
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
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    emptyStateText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
});
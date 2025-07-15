import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export const saveStoryWithAudio = async (title: string, content: string, audioUrl: string) => {
    const user = auth().currentUser;
    if (!user) {
        throw new Error('User not logged in');
    }

    const storyData = {
        title,
        content,
        audioUrl,
        author: user.email || 'Anonymous',
        createdAt: firestore.FieldValue.serverTimestamp(),
    };

    try {
        await firestore().collection('stories').add(storyData);
        console.log('✅ Story saved to Firestore');
    } catch (error) {
        console.error('❌ Error saving story:', error);
    }
};

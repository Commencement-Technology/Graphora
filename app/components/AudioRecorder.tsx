import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AudioRecorderPlayer, {
    AudioEncoderAndroidType,
    AudioSourceAndroidType,
    AVEncoderAudioQualityIOSType,
    AVEncodingOption,
    AVModeIOSOption,
} from 'react-native-audio-recorder-player';
import { useTheme } from '../context/ThemeContext';
import { requestAndroidAudioPermissions } from '../utils/permissions';

interface AudioRecorderProps {
    onRecordingComplete?: (filePath: string, fileType: string) => void;
    disabled?: boolean; // Prop to disable all interactions
}

const audioRecorderPlayer = new AudioRecorderPlayer();
// Configure default iOS options if needed. This is where you can specify `.m4a`
audioRecorderPlayer.setSubscriptionDuration(0.1); // Optional: Callback every 0.1 seconds for smoother updates

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled = false }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordSecs, setRecordSecs] = useState(0);
    const [recordTime, setRecordTime] = useState('00:00');
    const [playTime, setPlayTime] = useState('00:00');
    const [duration, setDuration] = useState('00:00');
    const [audioPath, setAudioPath] = useState<string | null>(null);

    const { theme } = useTheme();
    const waveformIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [waveformHeights, setWaveformHeights] = useState<number[]>(
        Array(10).fill(10) // Initial low bars
    );

    useEffect(() => {
        return () => {
            audioRecorderPlayer.removeRecordBackListener();
            audioRecorderPlayer.removePlayBackListener();
            // Stop any ongoing play/record when component unmounts
            audioRecorderPlayer.stopRecorder();
            audioRecorderPlayer.stopPlayer();
            if (waveformIntervalRef.current) {
                clearInterval(waveformIntervalRef.current);
            }
        };
    }, []);

    // Effect for dynamic waveform visualization during recording
    useEffect(() => {
        if (isRecording) {
            waveformIntervalRef.current = setInterval(() => {
                setWaveformHeights(prevHeights =>
                    prevHeights.map(() => Math.random() * 30 + 10) // More dynamic range for bars
                );
            }, 100); // Update every 100ms
        } else {
            if (waveformIntervalRef.current) {
                clearInterval(waveformIntervalRef.current);
                waveformIntervalRef.current = null;
            }
            // Reset to default low bars or fade out
            setWaveformHeights(Array(10).fill(10));
        }
    }, [isRecording]);


    const onStartRecord = async () => {
        if (disabled) return;

        try {
            if (Platform.OS === 'android') {
                const hasPermission = await requestAndroidAudioPermissions();
                if (!hasPermission) {
                    return; // The utility function already shows an alert
                }
            }

            if (isPlaying) {
                await onStopPlay();
            }

            const audioSet = {
                // Android specific settings
                AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
                AudioSourceAndroid: AudioSourceAndroidType.MIC,
                // iOS specific settings
                AVModeIOSOption: AVModeIOSOption.measurement,
                AVEncoderAudioQualityIOSType: AVEncoderAudioQualityIOSType.high,
                AVNumberOfChannelsIOSType: 2,
                AVFormatIDIOSType: AVEncodingOption.aac, // Use AAC for .m4a files on iOS
            };

            const path = await audioRecorderPlayer.startRecorder(undefined, audioSet);
            setIsRecording(true);
            setAudioPath(null); // Clear previous path until new recording is complete
            setRecordSecs(0);
            setRecordTime('00:00');

            audioRecorderPlayer.addRecordBackListener((e) => {
                setRecordSecs(e.currentPosition);
                setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
            });

            console.log(`[AudioRecorder] Recording started, path: ${path}`);
        } catch (error: any) {
            console.error('[AudioRecorder] Start recording error:', error);
            Alert.alert('Recording Error', 'Failed to start recording: ' + (error.message || 'Unknown error'));
        }
    };

    const onStopRecord = async () => {
        try {
            const path = await audioRecorderPlayer.stopRecorder();
            setIsRecording(false);
            audioRecorderPlayer.removeRecordBackListener();

            const detectedFileType = Platform.select({
                ios: 'audio/mp4', // .m4a is audio/mp4 MIME type
                android: 'audio/aac', // Common for Android AAC encoder
                default: 'audio/mp4', // Fallback
            });

            setAudioPath(path);
            setRecordSecs(0);
            setRecordTime('00:00');

            if (path && onRecordingComplete) {
                onRecordingComplete(path, detectedFileType);
            }
            console.log(`[AudioRecorder] Recording stopped, path: ${path}, type: ${detectedFileType}`);
        } catch (error: any) {
            console.error('[AudioRecorder] Stop recording error:', error);
            Alert.alert('Recording Error', 'Failed to stop recording: ' + (error.message || 'Unknown error'));
        }
    };

    const onStartPlay = async () => {
        if (disabled) return;
        if (!audioPath) {
            Alert.alert('No Recording', 'Please record audio first.');
            return;
        }
        try {
            console.log(`[AudioRecorder] Starting playback from: ${audioPath}`);
            await audioRecorderPlayer.startPlayer(audioPath);
            setIsPlaying(true);
            setPlayTime('00:00'); // Reset play time when starting

            audioRecorderPlayer.addPlayBackListener((e) => {
                setPlayTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
                setDuration(audioRecorderPlayer.mmssss(Math.floor(e.duration)));
                if (e.currentPosition >= e.duration) { // Use >= for robustness
                    onStopPlay();
                }
            });
        } catch (error: any) {
            console.error('[AudioRecorder] Play error:', error);
            Alert.alert('Playback Error', 'Failed to play recording: ' + (error.message || 'Unknown error'));
        }
    };

    const onPausePlay = async () => {
        try {
            await audioRecorderPlayer.pausePlayer();
            setIsPlaying(false);
            console.log('[AudioRecorder] Playback paused');
        } catch (error) {
            console.error('[AudioRecorder] Pause error:', error);
            Alert.alert('Playback Error', 'Failed to pause playback.');
        }
    };

    const onStopPlay = async () => {
        try {
            await audioRecorderPlayer.stopPlayer();
            audioRecorderPlayer.removePlayBackListener();
            setIsPlaying(false);
            setPlayTime('00:00'); // Reset play time
            console.log('[AudioRecorder] Playback stopped');
        } catch (error) {
            console.error('[AudioRecorder] Stop playback error:', error);
            // Alert.alert('Playback Error', 'Failed to stop playback.'); // Often not critical enough to alert the user
        }
    };

    const onReRecord = () => {
        onStopPlay(); // Stop playback if any
        setAudioPath(null); // Clear recorded audio path
        setPlayTime('00:00');
        setDuration('00:00');
        setRecordTime('00:00');
        setRecordSecs(0);
        console.log('[AudioRecorder] Ready for re-recording');
    };

    // Determine button disabled styles
    const getButtonStyles = (isActive: boolean, baseColor: string) => ({
        ...styles.button,
        backgroundColor: disabled ? theme.textLight : (isActive ? theme.accent : baseColor),
        opacity: disabled ? 0.6 : 1, // Visual feedback for disabled
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>🎤 Voice Note</Text>

            {/* Display time for recording or playback */}
            <Text style={[styles.timeDisplay, { color: theme.text }]}>
                {isRecording ? recordTime : (audioPath ? `${playTime} / ${duration}` : '00:00')}
            </Text>

            {/* Waveform visualization (dynamic during recording, static after) */}
            <View style={styles.waveformContainer}>
                {waveformHeights.map((height, index) => (
                    <View
                        key={index}
                        style={[
                            styles.bar,
                            {
                                height: isRecording ? height : (audioPath ? 15 : 5), // Dynamic for recording, subtle for recorded, tiny for none
                                backgroundColor: isRecording ? theme.primary : (audioPath ? theme.textLight : theme.borderColor),
                                opacity: isRecording ? 1 : (audioPath ? 0.8 : 0.5),
                            },
                        ]}
                    />
                ))}
            </View>

            {/* Record/Stop Button */}
            <TouchableOpacity
                style={getButtonStyles(isRecording, theme.primary)}
                onPress={isRecording ? onStopRecord : onStartRecord}
                disabled={disabled}
            >
                <Text style={styles.buttonText}>
                    {isRecording ? 'Stop Recording' : (audioPath ? 'Record New' : 'Start Recording')}
                </Text>
            </TouchableOpacity>

            {/* Playback Controls (only visible if audioPath exists and not recording) */}
            {audioPath && !isRecording && (
                <View style={styles.playbackControls}>
                    <TouchableOpacity
                        style={getButtonStyles(isPlaying, theme.success)}
                        onPress={isPlaying ? onPausePlay : onStartPlay}
                        disabled={disabled}
                    >
                        <Text style={styles.buttonText}>
                            {isPlaying ? 'Pause' : 'Play Audio'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            getButtonStyles(false, theme.error), // Use theme.error directly for stop/re-record
                            { marginTop: 12 } // Add margin for separation
                        ]}
                        onPress={onReRecord}
                        disabled={disabled}
                    >
                        <Text style={styles.buttonText}>🔁 Re-record</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 12, // More rounded corners
        elevation: 3, // Subtle shadow for Android
        shadowColor: '#000', // Subtle shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    label: {
        fontSize: 18, // Slightly larger
        marginBottom: 8,
        fontWeight: '700', // Bolder
        textAlign: 'center',
    },
    timeDisplay: {
        fontSize: 18, // Larger time display
        fontWeight: '500',
        marginBottom: 16, // More space below time
        textAlign: 'center',
    },
    waveformContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end', // Bars start from bottom
        width: '100%', // Ensure it takes full width
        height: 50, // Increased height for better visibility
        paddingHorizontal: 10,
        marginBottom: 20, // Space below waveform
    },
    bar: {
        width: 5, // Slightly wider bars
        borderRadius: 2,
        marginHorizontal: 1, // Small gap between bars
        // Note: Transitions are not supported in React Native styles
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10, // More rounded buttons
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50, // Ensure consistent height
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    playbackControls: {
        marginTop: 24, // Space between record button and playback buttons
    },
});

export default AudioRecorder;
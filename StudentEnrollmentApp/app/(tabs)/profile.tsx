import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';

import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/api/api';
import { tokenStorage } from '../../src/api/storage';

export default function Profile() {

  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 480;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleLogout = async () => {
    await tokenStorage.removeAuthTokens();

    router.replace('/(auth)/login');
  };

  // =====================================================
  // FETCH PROFILE
  // =====================================================

  const fetchProfile = useCallback(async () => {

    try {

      setLoading(true);

      const token = await tokenStorage.getItem('accessToken');

      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const res = await api.get('profile/');

      console.log('PROFILE DATA:', res.data);

      const userData = res.data;

      setProfile(userData);

      if (userData?.profile_picture) {
        setProfileImage(userData.profile_picture);
      }

    } catch (error: any) {

      console.log(
        'PROFILE ERROR:',
        error.response?.data || error
      );

      if (error.response?.status === 401) {

        await tokenStorage.removeAuthTokens();

        router.replace('/(auth)/login');

        return;
      }

      Alert.alert('Error', 'Failed to load profile');

    } finally {

      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // =====================================================
  // PICK IMAGE
  // =====================================================

  const pickImage = async () => {

    try {

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {

        Alert.alert(
          'Permission Required',
          'Gallery permission is needed.'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({

          mediaTypes: ImagePicker.MediaTypeOptions.Images,

          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });

      if (result.canceled) return;

      const image = result.assets[0];

      console.log('SELECTED IMAGE:', image);

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (
        image.mimeType &&
        !allowedTypes.includes(image.mimeType)
      ) {
        Alert.alert(
          'Invalid Image',
          'Only JPG, PNG, or WEBP images are allowed.'
        );

        return;
      }

      if (
        image.fileSize &&
        image.fileSize > 2 * 1024 * 1024
      ) {
        Alert.alert(
          'Invalid Image',
          'Profile picture must be 2MB or smaller.'
        );

        return;
      }

      setProfileImage(image.uri);

      await uploadProfilePicture(image);

    } catch (error) {

      console.log(error);

      Alert.alert(
        'Error',
        'Failed to pick image'
      );
    }
  };

  // =====================================================
  // UPLOAD PROFILE PICTURE
  // =====================================================

  const uploadProfilePicture = async (image: any) => {

    try {

      const token =
        await tokenStorage.getItem('accessToken');

      if (!token) {

        router.replace('/(auth)/login');

        return;
      }

      const formData = new FormData();

      if (Platform.OS === 'web') {

        const response = await fetch(image.uri);

        const blob = await response.blob();

        formData.append(
          'profile_picture',
          blob,
          'profile.jpg'
        );

      } else {

        formData.append(
          'profile_picture',
          {
            uri: image.uri,
            name: 'profile.jpg',
            type: 'image/jpeg',
          } as any
        );
      }

      const response = await api.patch(
        'profile/upload-picture/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log(
        'UPLOAD RESPONSE:',
        response.data
      );

      setProfileImage(
        response.data.profile_picture
      );

      Alert.alert(
        'Success',
        'Profile picture updated'
      );

    } catch (error: any) {

      console.log(
        'UPLOAD ERROR:',
        error.response?.data || error
      );

      Alert.alert(
        'Upload Failed',
        error.response?.data?.error || 'Failed'
      );
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <View style={styles.center}>

        <ActivityIndicator
          size="large"
          color="#1E90FF"
        />

      </View>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (

    <ScrollView
      contentContainerStyle={[
        styles.container,
        isSmallScreen && styles.compactContainer,
      ]}
    >

      <Text style={styles.title}>
        Student Profile
      </Text>

      {/* PROFILE IMAGE */}

      <View style={styles.imageContainer}>

        <TouchableOpacity
          onPress={pickImage}
        >

          <Image
            source={
              profileImage
                ? { uri: profileImage }
                : require('../../assets/images/icon.png')
            }
            style={styles.profileImage}
          />

        </TouchableOpacity>

        <Text style={styles.changePhotoText}>
          Tap to change profile picture
        </Text>

      </View>

      {/* PROFILE INFO */}

      {profile ? (

        <View style={styles.card}>

          <Text style={styles.text}>
            Name: {profile?.first_name || ''}{' '}
            {profile?.last_name || ''}
          </Text>

          <Text style={styles.text}>
            Email: {profile?.email || 'N/A'}
          </Text>

          <Text style={styles.text}>
            Student Number:{' '}
            {profile?.student_number || 'N/A'}
          </Text>

          <Text style={styles.text}>
            Course: {profile?.course || 'N/A'}
          </Text>

          <Text style={styles.text}>
            Year Level:{' '}
            {profile?.year_level || 'N/A'}
          </Text>

          <Text style={styles.text}>
            Semester:{' '}
            {profile?.semester || 'N/A'}
          </Text>

          <Text style={styles.text}>
            Birthday:{' '}
            {profile?.birthday || 'N/A'}
          </Text>

          <Text style={styles.text}>
            Contact:{' '}
            {profile?.contact_number || 'N/A'}
          </Text>

          <Text style={styles.text}>
            Address:{' '}
            {profile?.home_address || 'N/A'}
          </Text>

          <Text style={styles.text}>
            Parent:{' '}
            {profile?.parent_name || 'N/A'}
          </Text>

        </View>

      ) : (

        <Text>No profile data found</Text>

      )}

      {/* LOGOUT */}

      <View
        style={{
          marginTop: 20,
          width: '100%',
        }}
      >

        <Button
          title="Logout"
          onPress={handleLogout}
        />

      </View>

    </ScrollView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 88,
    backgroundColor: '#fff',
    alignItems: 'center',
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },

  compactContainer: {
    paddingHorizontal: 14,
    paddingTop: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },

  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#1E90FF',
    backgroundColor: '#ddd',
  },

  changePhotoText: {
    marginTop: 10,
    color: '#1E90FF',
    fontSize: 14,
  },

  card: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },

  text: {
    fontSize: 16,
    marginBottom: 10,
  },

});

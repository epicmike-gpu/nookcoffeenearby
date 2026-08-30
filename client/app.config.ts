import { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.COZE_PROJECT_NAME || process.env.EXPO_PUBLIC_COZE_PROJECT_NAME || '咖啡探店';
const projectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;
const slugAppName = projectId ? `app${projectId}` : 'coffeeshop';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": appName,
    "slug": slugAppName,
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "coffeeshop",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.coffeeshop.explorer",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": `Coffee Explorer needs your location to find nearby coffee shops and provide navigation.`,
        "NSCameraUsageDescription": `Coffee Explorer needs camera access to take check-in photos.`,
        "NSPhotoLibraryUsageDescription": `Coffee Explorer needs photo library access so you can upload or save images.`,
        "NSMicrophoneUsageDescription": `Coffee Explorer needs microphone access to record video sound.`,
        "LSApplicationQueriesSchemes": [
          "iosamap",
          "baidumap",
          "comgooglemaps",
          "tel"
        ],
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#FAFAFA"
      },
      "package": `com.coffeeshop.explorer`,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      process.env.EXPO_PUBLIC_BACKEND_BASE_URL ? [
        "expo-router",
        {
          "origin": process.env.EXPO_PUBLIC_BACKEND_BASE_URL
        }
      ] : 'expo-router',
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#FAFAFA"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Coffee Explorer needs photo library access so you can upload check-in photos or save shop images.",
          "cameraPermission": "Coffee Explorer needs camera access to take check-in photos.",
          "microphonePermission": "Coffee Explorer needs microphone access to record sound with your check-in photos."
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Coffee Explorer needs your location to find nearby coffee shops and provide navigation."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Coffee Explorer needs camera access to take check-in photos.",
          "microphonePermission": "Coffee Explorer needs microphone access to record sound with your check-in photos.",
          "recordAudioAndroid": true
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}

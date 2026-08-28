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
        ]
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
          "photosPermission": `允许新项目访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许新项目使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许新项目访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": `新项目需要访问您的位置以提供周边咖啡店搜索及导航功能。`
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": `新项目需要访问相机以拍摄打卡照片。`,
          "microphonePermission": `新项目需要访问麦克风以录制视频声音。`,
          "recordAudioAndroid": true
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}

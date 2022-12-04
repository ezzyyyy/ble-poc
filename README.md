# Bluetooth Low Energy
### Implemented on React Native

Follow the steps below for the setup:

1.	Install libraries using Yarn

    ``yarn install``

2.	Install Pods (iOS)

    ``cd ios && pod install && cd ..``

Physical devices are necessary to run the app:

3.	Run metro bundler:

    ``npx react-native start``

4. To run on iOS:
- Open XCode
- Connect your physical iOS device
- Clean, build and run app

5. To run on Android:
- Open Android Studio 
- Connect your physical Android device
- Clean, build and run app
- Expose Android port to laptop port:

  ``adb reverse tcp:8081 tcp:8081``

# ble-poc

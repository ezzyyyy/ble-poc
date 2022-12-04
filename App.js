/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  NativeModules,
  Button,
  Switch,
  View,
  Text,
  FlatList,
  Alert,
  Platform,
  DeviceEventEmitter,
  NativeEventEmitter,
} from 'react-native';

import {useEffect, useState} from 'react';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {BleManager} from 'react-native-ble-plx';

const {SwiftComponentManager} = NativeModules;
const IOSFeedbackEvents = new NativeEventEmitter(
  NativeModules.SwiftComponentManager,
);

import {Buffer} from 'buffer';

const _BleManager = new BleManager();

const Item = ({name, localName, rssi}) => (
  <View style={styles.item}>
    <Text>LOCAL NAME: {localName}</Text>
    <Text>RSSI: {rssi} dBm</Text>
  </View>
);

const App: () => Node = () => {
  const [nextScan, setNextScan] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isPeripheral, setIsPeripheral] = useState(false);
  const [peripheralDeviceName, setPeripheralDeviceName] = useState('');
  const toggleSwitch = () => setIsPeripheral(previousState => !previousState);

  const [device, setDevice] = useState({});
  const [devices, setDevices] = useState(null);

  const [bleFeedback, setBleFeedback] = useState('');

  useEffect(() => {
    DeviceEventEmitter.addListener('sendFeedback', feedback => {
      console.log('FEEDBACK: ', feedback);
      setBleFeedback(feedback.message);
    });
  }, []);

  useEffect(() => {
    IOSFeedbackEvents.addListener('sendIOSFeedback', iosFeedback => {
      console.log('IOS FEEDBACK: ', iosFeedback);
      setBleFeedback(iosFeedback);
    });

    return () => {
      IOSFeedbackEvents.removeAllListeners();
    };
  }, []);

  // const testAndroid = () => {
  //   if (Platform.OS !== 'ios') {
  //     NativeModules.AndroidBleManager.getDeviceName((err, name) => {
  //       console.log(err, name);
  //     });
  //   }
  // };

  // const testAndroidAdv = () => {
  //   if (Platform.OS !== 'ios') {
  //     NativeModules.AndroidBleManager.startAdvertising();
  //   }
  // };

  const stopAdvertising = async () => {
    if (Platform.OS === 'ios') {
      SwiftComponentManager.passStopAdvertising();
    } else {
      NativeModules.AndroidBleManager.stopAdvertising();
    }
  };

  const advertiseAsPeripheral = async () => {
    if (Platform.OS === 'ios') {
      SwiftComponentManager.passValueFromReact('Hello World');
      SwiftComponentManager.passDeviceLocalName()
        .then(res => {
          if (res) {
            setPeripheralDeviceName(res);
          }
        })
        .catch(e => console.log(e.message, e.code));
    } else {
      NativeModules.AndroidBleManager.startAdvertising();
      NativeModules.AndroidBleManager.getDeviceName((err, name) => {
        if (name) {
          console.log('ANDROID RECEIVED DATA:', err, name);
          setPeripheralDeviceName(name);
        }
      });
    }
  };

  const resetCentral = () => {
    stopScan();
    setDevices([]);
  };

  useEffect(() => {
    console.log(isPeripheral);
    if (isPeripheral) {
      resetCentral();
      advertiseAsPeripheral();
    } else {
      stopAdvertising();
    }
  }, [isPeripheral]);

  const decodeBase64 = data => {
    return Buffer.from(data, 'base64').toString('utf8');
  };

  const startScan = () => {
    console.log('Start scanning...');
    setDevices([]);

    try {
      console.log('Try scanning devices...');
      _BleManager.startDeviceScan(
        null,
        {
          allowDuplicates: false,
        },
        async (error, d) => {
          console.log('Scanning...');
          if (error) {
            _BleManager.stopDeviceScan();
          }
          console.log(device.localName, device.rssi);

          // Conditions for successful connection.
          if (d.rssi > -70 && /^JR:.*$/.test(d.localName)) {
            // Display scanned devices
            setDevices(prevState => [...prevState, d]);
            console.log(
              d.name + ' | ' + d.localName + ' | ' + d.id + ' | ' + d.rssi,
            );
            if (!isCheckingIn) {
              console.log('Setting new device: ', d.localName);
              setDevice(d);
            }
            setIsCheckingIn(true);
          }
        },
      );
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (isCheckingIn) {
      console.log('Connecting new device...');
      connectDevice();
    }
  }, [isCheckingIn]);

  useEffect(() => {
    if (nextScan) {
      console.log('Start new scan...');
      startScan();
      setNextScan(false);
    }
  }, [nextScan]);

  const stopConnection = () => {
    console.log('Stopping connection...');
    disconnectDevice();
  };

  const stopScan = () => {
    console.log('Stopping BLE scan...');
    _BleManager.stopDeviceScan();
    console.log('Stopped BLE scan.');
  };

  const connectDevice = () => {
    stopScan();

    _BleManager.connectToDevice(device.id).then(async connectedDevice => {
      await device.discoverAllServicesAndCharacteristics();

      _BleManager.stopDeviceScan();
      console.log(`Device connected\n with ${connectedDevice.name}`);

      let services = await connectedDevice.services();

      for (let ser of services) {
        let chars = await ser.characteristics();
        for (let c of chars) {
          await connectedDevice
            .readCharacteristicForService(ser.uuid, c.uuid)
            .then(res => {
              console.log(res.value);
              if (res.isReadable) {
                let dataReceived = decodeBase64(res.value);
                console.log(dataReceived);

                if (/^JRDATA:.*$/.test(dataReceived)) {
                  Alert.alert(
                    'Data received!',
                    dataReceived,
                    [
                      {
                        text: 'OK',
                        onPress: () => stopConnection(),
                      },
                    ],
                    {cancelable: false},
                  );
                }
              }
            })
            .catch(err => console.log(err));
        }
      }
    });
  };

  const disconnectDevice = async () => {
    _BleManager
      .cancelDeviceConnection(device.id)
      .then(res => {
        console.log('Disconnected from: ' + res.name);
        setDevice({});
        setIsCheckingIn(false);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        console.log('Connection closed.');
        setNextScan(true);
      });
  };

  const renderDeviceDetail = ({item}) => (
    <Item localName={item.localName} rssi={item.rssi} />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* {renderBtn('BLE Test Adv', testAndroidAdv)}
      {renderBtn('BLE Android', testAndroid)} */}
      <Text>{bleFeedback}</Text>
      <View style={styles.svContainer}>
        <Text style={styles.bleType}>Choose BLE Type:</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Central</Text>
          <Switch
            trackColor={{false: 'blue', true: 'red'}}
            ios_backgroundColor="blue"
            onValueChange={toggleSwitch}
            value={isPeripheral}
          />
          <Text style={styles.switchLabel}>Peripheral</Text>
        </View>

        {isPeripheral ? (
          <>
            <Text style={styles.peripheralTitle}>
              Your device is now a peripheral and is discoverable.
            </Text>
            <Text style={styles.deviceNameLabel}>Your Device Name:</Text>
            <Text>{peripheralDeviceName ? peripheralDeviceName : 'None'}</Text>
          </>
        ) : (
          <>
            {renderBtn('Scan', startScan)}
            {renderBtn('Stop scan', stopScan)}
            {renderBtn('connectDevice', connectDevice)}

            <Text style={styles.listTitle}>Scanned Devices</Text>
            {devices ? (
              <FlatList
                inverted={true}
                data={devices}
                renderItem={renderDeviceDetail}
                keyExtractor={(item, index) => index}
              />
            ) : (
              <Text style={styles.listEmpty}>List is empty.</Text>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

function renderBtn(text, onClick) {
  return (
    <Button
      backgroundColor={Colors.blue30}
      title={text.toString()}
      size="small"
      borderRadius={0}
      labelStyle={styles.labelStyle}
      style={styles.btn}
      enableShadow
      onPress={onClick}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
  },
  svContainer: {
    margin: 20,
  },
  title: {
    flex: 1,
    margin: 10,
    fontSize: 16,
  },
  item: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'lightgray',
  },
  bleType: {
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchLabel: {
    margin: 25,
  },
  peripheralTitle: {
    marginTop: 50,
    fontWeight: 'bold',
  },
  deviceNameLabel: {
    marginTop: 20,
  },
  listTitle: {
    margin: 40,
    fontWeight: 'bold',
    fontSize: 16,
    alignSelf: 'center',
  },
  listEmpty: {
    alignSelf: 'center',
  },
  labelStyle: {
    fontWeight: '300',
  },
  btn: {
    marginBottom: 20,
    marginHorizontal: 10,
  },
});

export default App;

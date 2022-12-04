//
//  SwiftComponentManager.swift
//  AwesomeProject
//
//  Created by Ezra Yeoshua on 18/10/22.
//

import Foundation
import CoreBluetooth

@objc(SwiftComponentManager)
class SwiftComponentManager: RCTEventEmitter, CBPeripheralManagerDelegate {
  
  private var peripheralManager : CBPeripheralManager!
  
  private var service: CBUUID!
  private let value: String
  private let helpers = Helpers()
  private let deviceLocalName: String
  
  //  UUID of characteristic with data inside.
  private let char1Uuid = CBUUID(nsuuid: UUID())
  private let char2Uuid = CBUUID(nsuuid: UUID())
  
  override init() {
    self.deviceLocalName = "JR:\(helpers.randomAlphaNumericString(length: 8))"
    self.value = "JRDATA:\(helpers.randomAlphaNumericString(length: 4))"
    super.init()
  }
  
  
  func startAdvertising() {
    print("[BLE] Advertising Data...")
    peripheralManager.startAdvertising([CBAdvertisementDataLocalNameKey : deviceLocalName, CBAdvertisementDataServiceUUIDsKey :     [service]])
    print("[BLE] Started Advertising")
  }
  
  func stopAdvertising() {
    //    TODO: Check whether the peripheral manager is still advertising
    //    TODO: Remove devices after stopping advertisement
    
    peripheralManager?.stopAdvertising()
    print("[BLE] Stopped Advertising")
  }
  
  func addServices() {
    let valueData = value.data(using: .utf8)
    //     Creating iOS application as Bluetooth PeripheralCreating iOS application as Bluetooth Peripheral
    // 1. Create instance of CBMutableCharcateristic
    let myChar1 = CBMutableCharacteristic(type: char1Uuid, properties: [.notify, .write, .read], value: nil, permissions: [.readable, .writeable])
    let myChar2 = CBMutableCharacteristic(type: char2Uuid, properties: [.read], value: valueData, permissions: [.readable])
    // 2. Create instance of CBMutableService
    service = CBUUID(nsuuid: UUID())
    let myService = CBMutableService(type: service, primary: true)
    // 3. Add characteristics to the service
    myService.characteristics = [myChar1, myChar2]
    // 4. Add service to peripheralManager
    peripheralManager.add(myService)
    // 5. Start advertising
    startAdvertising()
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest)
  {
    
    if request.characteristic.uuid.isEqual(char1Uuid)
    {
      print("Read Request UUIDs matched: ", request.characteristic.uuid, char1Uuid)
      // Set the correspondent characteristic's value
      // to the request
      request.value = value.data(using: .utf8)
      
      // Respond to the request
      peripheralManager.respond(
        to: request,
        withResult: .success)
      
      // Send feedback event to React Native.
      sendEvent(withName: "sendIOSFeedback", body: ["message","this is my ios feedback"])
    }
  }
  
  override func supportedEvents() -> [String]! {
    return ["sendIOSFeedback"]
  }
  
  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    switch peripheral.state {
      //Creating iOS application as Bluetooth Peripheral
    case .unknown:
      print("[BLE] Bluetooth Device is UNKNOWN")
    case .unsupported:
      print("[BLE] Bluetooth Device is UNSUPPORTED")
    case .unauthorized:
      print("[BLE] Bluetooth Device is UNAUTHORIZED")
    case .resetting:
      print("[BLE] Bluetooth Device is RESETTING")
    case .poweredOff:
      print("[BLE] Bluetooth Device is POWERED OFF")
    case .poweredOn:
      print("[BLE] Bluetooth Device is POWERED ON")
      addServices()
    @unknown default:
      print("[BLE] Unknown State")
    }
  }
  
  @objc func passStopAdvertising() {
    debugPrint("[BLE] Stopping...")
    stopAdvertising()
  }
  
  @objc func passValueFromReact(_ value : String) {
    debugPrint("[BLE] Print Here \(value)")
    peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    debugPrint("[BLE] start BLE...")
  }
  
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  //  @objc
  //  override func constantsToExport() -> String! {
  //    return deviceLocalName
  //  }
  //
  @objc
  func passDeviceLocalName(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) -> Void {
    if (deviceLocalName == "") {
      let error = NSError(domain: "", code: 200, userInfo: nil)
      reject("ERROR_FOUND", "failure", error)
    } else {
      resolve(deviceLocalName)
    }
  }
}

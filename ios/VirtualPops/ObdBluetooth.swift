import CoreBluetooth
import UIKit

/// ELM327 Bluetooth BLE (4.0). Os adaptadores Bluetooth "comuns" (2.0) não conversam com o iPhone.
/// Procura por 4 segundos, mostra a lista pra pessoa escolher e acha o canal de dados do adaptador.
final class ObdBluetooth: NSObject, ObdLink, CBCentralManagerDelegate, CBPeripheralDelegate {
    /// serviços de dados dos adaptadores BLE mais comuns (mesma lista do js/obd.js)
    private static let services = ["FFF0", "FFE0", "18F0", "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2"].map { CBUUID(string: $0) }

    private let onData: (String) -> Void
    private let onLost: () -> Void
    private let present: (UIAlertController) -> Void
    private var central: CBCentralManager?
    private var found: [UUID: (peripheral: CBPeripheral, rssi: Int, name: String)] = [:]
    private var peripheral: CBPeripheral?
    private var rx: CBCharacteristic?
    private var tx: CBCharacteristic?
    private var pendingServices = 0
    private var done: ((Error?) -> Void)?
    private var scanning = false
    private var opened = false
    private var closed = false

    init(onData: @escaping (String) -> Void, onLost: @escaping () -> Void, present: @escaping (UIAlertController) -> Void) {
        self.onData = onData
        self.onLost = onLost
        self.present = present
        super.init()
    }

    func open(_ done: @escaping (Error?) -> Void) {
        self.done = done
        central = CBCentralManager(delegate: self, queue: .main)
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            if done != nil, peripheral == nil, !scanning { scan() }
        case .poweredOff:
            if opened { lost() } else { finish(.bleOff) }
        case .unauthorized:
            finish(.bleDenied)
        case .unsupported:
            finish(.bleNone)
        default:
            break
        }
    }

    private func scan() {
        scanning = true
        found = [:]
        central?.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in self?.pick() }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? ""
        guard !name.isEmpty else { return }
        found[peripheral.identifier] = (peripheral, RSSI.intValue, name)
    }

    /// nomes típicos de adaptador OBD vão pro topo da lista; depois, o sinal mais forte
    private static func score(_ name: String, _ rssi: Int) -> Int {
        let n = name.lowercased()
        let obd = ["obd", "elm", "vlink", "v-link", "vgate", "icar", "veepeak", "konnwei", "kiwi", "carista"].contains { n.contains($0) }
        return (obd ? 1000 : 0) + rssi
    }

    private func pick() {
        guard scanning else { return }
        scanning = false
        central?.stopScan()
        guard done != nil else { return }
        let list = found.values.sorted { Self.score($0.name, $0.rssi) > Self.score($1.name, $1.rssi) }.prefix(12)
        guard !list.isEmpty else {
            finish(.bleNone)
            return
        }
        let alert = UIAlertController(title: "Adaptador OBD2", message: "Escolha o seu ELM327 Bluetooth", preferredStyle: .actionSheet)
        for item in list {
            alert.addAction(UIAlertAction(title: item.name, style: .default) { [weak self] _ in self?.connect(item.peripheral) })
        }
        alert.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { [weak self] _ in self?.finish(.cancelled) })
        present(alert)
    }

    private func connect(_ target: CBPeripheral) {
        peripheral = target
        target.delegate = self
        central?.connect(target, options: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 12) { [weak self] in
            guard let self, self.done != nil, self.peripheral === target else { return }
            self.finish(.bleConnect)
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.discoverServices(Self.services)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        finish(.bleConnect)
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        if opened { lost() } else { finish(.bleConnect) }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        let list = (peripheral.services ?? []).filter { Self.services.contains($0.uuid) }
        guard !list.isEmpty else {
            finish(.bleNoService)
            return
        }
        pendingServices = list.count
        for service in list { peripheral.discoverCharacteristics(nil, for: service) }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        pendingServices -= 1
        if rx == nil {
            let chars = service.characteristics ?? []
            let notify = chars.first { $0.properties.contains(.notify) || $0.properties.contains(.indicate) }
            let write = chars.first { $0.properties.contains(.write) || $0.properties.contains(.writeWithoutResponse) }
            if let notify, let write {
                rx = notify
                tx = write
                peripheral.setNotifyValue(true, for: notify)
                return
            }
        }
        if pendingServices <= 0, rx == nil { finish(.bleNoService) }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        guard characteristic == rx, !opened else { return }
        if error != nil {
            finish(.bleNoService)
            return
        }
        opened = true
        let callback = done
        done = nil
        callback?(nil)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard characteristic == rx, let value = characteristic.value, !value.isEmpty else { return }
        onData(String(decoding: value, as: UTF8.self))
    }

    func write(_ text: String) {
        guard let target = peripheral, let tx else { return }
        let type: CBCharacteristicWriteType = tx.properties.contains(.writeWithoutResponse) ? .withoutResponse : .withResponse
        let data = Data(text.utf8)
        let size = max(20, target.maximumWriteValueLength(for: type))
        var start = 0
        while start < data.count {
            let end = min(data.count, start + size)
            target.writeValue(data.subdata(in: start..<end), for: tx, type: type)
            start = end
        }
    }

    func close() {
        closed = true
        done = nil
        if scanning {
            scanning = false
            central?.stopScan()
        }
        if let target = peripheral { central?.cancelPeripheralConnection(target) }
        peripheral = nil
    }

    private func lost() {
        guard !closed else { return }
        closed = true
        onLost()
    }

    private func finish(_ error: ObdError) {
        guard let callback = done else { return }
        done = nil
        if scanning {
            scanning = false
            central?.stopScan()
        }
        if let target = peripheral { central?.cancelPeripheralConnection(target) }
        peripheral = nil
        callback(error)
    }
}

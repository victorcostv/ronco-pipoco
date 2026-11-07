import Foundation
import Network

/// ELM327 Wi-Fi: o adaptador cria uma rede Wi-Fi própria e atende numa porta TCP fixa.
/// O iPhone precisa estar conectado na rede dele (Ajustes > Wi-Fi) antes de tocar em Conectar.
final class ObdWifi: ObdLink {
    /// endereços mais comuns dos adaptadores Wi-Fi
    private static let candidates: [(host: String, port: UInt16)] = [
        ("192.168.0.10", 35000), ("192.168.1.10", 35000), ("192.168.0.10", 23)
    ]

    private let queue = DispatchQueue(label: "ronco.obd.wifi")
    private let onData: (String) -> Void
    private let onLost: () -> Void
    private var conn: NWConnection?
    private var closed = false

    init(onData: @escaping (String) -> Void, onLost: @escaping () -> Void) {
        self.onData = onData
        self.onLost = onLost
    }

    func open(_ done: @escaping (Error?) -> Void) {
        queue.async { self.attempt(0, done) }
    }

    /// Só para teste no simulador: RONCO_OBD_HOST=127.0.0.1:35000 aponta para um ELM327 de mentira no Mac.
    private static var testTarget: (host: String, port: UInt16)? {
        #if DEBUG
        let parts = (ProcessInfo.processInfo.environment["RONCO_OBD_HOST"] ?? "").split(separator: ":")
        if parts.count == 2, let port = UInt16(parts[1]) { return (String(parts[0]), port) }
        #endif
        return nil
    }

    private func attempt(_ index: Int, _ done: @escaping (Error?) -> Void) {
        guard !closed else { return }
        let list = Self.testTarget.map { [$0] } ?? Self.candidates
        guard index < list.count else {
            done(ObdError.wifi)
            return
        }
        let target = list[index]
        let tcp = NWProtocolTCP.Options()
        tcp.noDelay = true
        let params = NWParameters(tls: nil, tcp: tcp)
        if Self.testTarget == nil { params.requiredInterfaceType = .wifi }
        let connection = NWConnection(host: NWEndpoint.Host(target.host), port: NWEndpoint.Port(rawValue: target.port)!, using: params)
        var settled = false
        // na primeira tentativa o iPhone pode perguntar sobre a rede local: dá mais tempo pra pessoa responder
        let limit: Double = index == 0 ? 12 : 4
        queue.asyncAfter(deadline: .now() + limit) {
            guard !settled else { return }
            settled = true
            connection.cancel()
            self.attempt(index + 1, done)
        }
        connection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                guard !settled else { return }
                settled = true
                self.conn = connection
                self.receive(connection)
                done(nil)
            case .failed, .cancelled:
                if !settled {
                    settled = true
                    self.attempt(index + 1, done)
                } else if connection === self.conn, !self.closed {
                    self.closed = true
                    self.onLost()
                }
            default:
                break
            }
        }
        connection.start(queue: queue)
    }

    private func receive(_ connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { data, _, isComplete, error in
            if let data, !data.isEmpty { self.onData(String(decoding: data, as: UTF8.self)) }
            if isComplete || error != nil {
                if !self.closed {
                    self.closed = true
                    self.onLost()
                }
                return
            }
            self.receive(connection)
        }
    }

    func write(_ text: String) {
        queue.async { self.conn?.send(content: Data(text.utf8), completion: .contentProcessed { _ in }) }
    }

    func close() {
        queue.async {
            self.closed = true
            self.conn?.cancel()
            self.conn = nil
        }
    }
}

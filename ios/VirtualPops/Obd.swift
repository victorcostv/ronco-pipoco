import Foundation

/// Canal de texto com o ELM327. Toda a conversa AT/OBD (ATZ, 010C…) continua na página,
/// em js/obd.js; o app só abre a conexão e passa o texto de um lado pro outro.
protocol ObdLink: AnyObject {
    func open(_ done: @escaping (Error?) -> Void)
    func write(_ text: String)
    func close()
}

enum ObdError: Error {
    case cancelled, wifi, bleOff, bleDenied, bleNone, bleConnect, bleNoService

    /// nome e mensagem que a página entende (obdErrText em js/app.js)
    var js: (name: String, message: String) {
        switch self {
        case .cancelled: return ("NotFoundError", "cancelado")
        case .wifi: return ("Error", "wifi-sem-resposta")
        case .bleOff: return ("Error", "ble-desligado")
        case .bleDenied: return ("Error", "ble-negado")
        case .bleNone: return ("Error", "ble-nenhum")
        case .bleConnect: return ("Error", "ble-conexao")
        case .bleNoService: return ("Error", "ble-sem-servico")
        }
    }
}

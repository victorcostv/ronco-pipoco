import SwiftUI
import WebKit

/// Recebe os pedidos da página (vibração, tela acesa, modo painel, OBD2) e devolve os dados do OBD2.
/// A outra ponta está em ronco-ios.js.
@MainActor
final class NativeBridge: NSObject, ObservableObject, WKScriptMessageHandler {
    /// modo painel ligado na página: some a barra de status e o traço de início
    @Published var cockpit = false

    private weak var webView: WKWebView?
    private weak var presenter: UIViewController?
    private let tapLight = UIImpactFeedbackGenerator(style: .medium)
    private let tapHeavy = UIImpactFeedbackGenerator(style: .heavy)
    private var links: [Int: ObdLink] = [:]

    func attach(webView: WKWebView, presenter: UIViewController) {
        self.webView = webView
        self.presenter = presenter
        tapLight.prepare()
        tapHeavy.prepare()
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["t"] as? String else { return }
        let id = (body["id"] as? NSNumber)?.intValue ?? 0
        switch type {
        case "haptic":
            let ms = (body["ms"] as? NSNumber)?.doubleValue ?? 0
            (ms >= 20 ? tapHeavy : tapLight).impactOccurred()
        case "awake":
            UIApplication.shared.isIdleTimerDisabled = (body["on"] as? Bool) ?? false
        case "cockpit":
            cockpit = (body["on"] as? Bool) ?? false
        case "obdOpen":
            openObd(id: id, kind: (body["kind"] as? String) ?? "wifi")
        case "obdWrite":
            if let text = body["data"] as? String { links[id]?.write(text) }
        case "obdClose":
            links[id]?.close()
            links[id] = nil
        case "log":
            NSLog("[página] %@ %@", body["lv"] as? String ?? "", body["msg"] as? String ?? "")
        default:
            break
        }
    }

    private func openObd(id: Int, kind: String) {
        let onData: (String) -> Void = { [weak self] text in
            DispatchQueue.main.async { self?.call("_data", id, text) }
        }
        let onLost: () -> Void = { [weak self] in
            DispatchQueue.main.async {
                guard let self, self.links[id] != nil else { return }
                self.links[id] = nil
                self.call("_lost", id)
            }
        }
        let link: ObdLink
        if kind == "ble" {
            link = ObdBluetooth(onData: onData, onLost: onLost) { [weak self] alert in
                self?.presenter?.present(alert, animated: true)
            }
        } else {
            link = ObdWifi(onData: onData, onLost: onLost)
        }
        links[id] = link
        link.open { [weak self] error in
            DispatchQueue.main.async {
                guard let self else { return }
                guard let error else {
                    self.call("_opened", id, NSNull())
                    return
                }
                self.links[id] = nil
                let js = (error as? ObdError)?.js ?? (name: "Error", message: error.localizedDescription)
                self.call("_opened", id, ["name": js.name, "message": js.message])
            }
        }
    }

    /// Chama window.roncoNative.<fn>(id, valor) com o valor em JSON (texto do ELM327, erro ou null).
    private func call(_ fn: String, _ id: Int, _ value: Any? = nil) {
        var arg = ""
        if let value,
           let data = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]),
           let json = String(data: data, encoding: .utf8) {
            arg = ", " + json
        }
        webView?.evaluateJavaScript("window.roncoNative && window.roncoNative.\(fn)(\(id)\(arg))", completionHandler: nil)
    }
}

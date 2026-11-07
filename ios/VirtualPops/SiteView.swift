import SwiftUI
import WebKit

/// Mostra o site empacotado num WKWebView de tela inteira (o próprio site cuida das bordas do iPhone).
struct SiteView: UIViewControllerRepresentable {
    let bridge: NativeBridge

    func makeUIViewController(context: Context) -> SiteViewController {
        SiteViewController(bridge: bridge)
    }

    func updateUIViewController(_ controller: SiteViewController, context: Context) {}
}

final class SiteViewController: UIViewController, WKNavigationDelegate {
    private let bridge: NativeBridge
    private var webView: WKWebView!

    init(bridge: NativeBridge) {
        self.bridge = bridge
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) não é usado")
    }

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(SiteSchemeHandler(), forURLScheme: SiteSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let content = config.userContentController
        content.add(bridge, name: "ronco")
        if let url = Bundle.main.url(forResource: "ronco-ios", withExtension: "js"),
           let source = try? String(contentsOf: url, encoding: .utf8) {
            content.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }

        let web = WKWebView(frame: .zero, configuration: config)
        let background = UIColor(named: "LaunchBg") ?? .black
        web.isOpaque = false
        web.backgroundColor = background
        web.scrollView.backgroundColor = background
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.navigationDelegate = self
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        webView = web
        bridge.attach(webView: web, presenter: self)
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.load(URLRequest(url: SiteSchemeHandler.startURL))
    }

    // se o iOS fechar o processo da página (pouca memória), carrega de novo em vez de ficar em branco
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.load(URLRequest(url: SiteSchemeHandler.startURL))
    }
}

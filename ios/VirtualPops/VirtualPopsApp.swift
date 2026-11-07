import AVFoundation
import SwiftUI

/// Virtual Pops para iPhone: o mesmo site (pasta raiz do repositório) empacotado dentro do app,
/// sem precisar de internet, com o que o navegador do iPhone não dá: vibração, tela sempre acesa,
/// modo painel em tela cheia e OBD2 pelo Wi-Fi ou Bluetooth BLE.
@main
struct VirtualPopsApp: App {
    @StateObject private var bridge = NativeBridge()

    init() {
        // o ronco toca mesmo com a chave de silencioso ligada (no site isso é o audioSession "playback")
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
    }

    var body: some Scene {
        WindowGroup {
            SiteView(bridge: bridge)
                .ignoresSafeArea()
                .background(Color("LaunchBg").ignoresSafeArea())
                .statusBarHidden(bridge.cockpit)
                .persistentSystemOverlays(bridge.cockpit ? .hidden : .automatic)
                .preferredColorScheme(.dark)
        }
    }
}

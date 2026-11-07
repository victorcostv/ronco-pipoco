# Virtual Pops no iPhone

O app é o site deste repositório empacotado dentro de um app nativo. Cada compilação copia o site atual
(raiz do repositório) para dentro do app, então **mudou o site, é só compilar e enviar de novo**.

- Bundle: `br.com.roncopipoco.app`, equipe `M93G6QRV84`
- O Xcode precisa estar com o seu Apple ID (Xcode → Ajustes → Contas). Se o envio reclamar de conta, entre de novo lá.

## Mandar uma versão nova para o TestFlight

1. Em `ios/RoncoPipoco.xcodeproj/project.pbxproj`, aumente o **número da compilação** (`CURRENT_PROJECT_VERSION`, nas duas configurações). A Apple recusa número repetido. Para versão nova na loja, aumente também `MARKETING_VERSION` (ex.: 1.1).
2. Gere a versão final:

```bash
cd ios && xcodebuild -project RoncoPipoco.xcodeproj -scheme RoncoPipoco -configuration Release -destination 'generic/platform=iOS' -archivePath /tmp/RoncoPipoco.xcarchive -allowProvisioningUpdates archive
```

3. Envie para o App Store Connect:

```bash
cd ios && xcodebuild -exportArchive -archivePath /tmp/RoncoPipoco.xcarchive -exportOptionsPlist ExportOptions-AppStore.plist -exportPath /tmp/RoncoPipoco-envio -allowProvisioningUpdates
```

4. Em 10 a 30 minutos a compilação aparece no TestFlight e chega sozinha no seu iPhone (grupo interno com distribuição automática).

## Testar no simulador

```bash
cd ios && xcodebuild -project RoncoPipoco.xcodeproj -scheme RoncoPipoco -destination 'platform=iOS Simulator,name=iPhone 18 Pro' build
```

Para testar o OBD2 Wi-Fi sem carro, rode um ELM327 de mentira no Mac (porta 35000) e abra o app com
`SIMCTL_CHILD_RONCO_OBD_HOST=127.0.0.1:35000 xcrun simctl launch booted br.com.roncopipoco.app`
(só funciona na compilação Debug).

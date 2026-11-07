# Virtual Pops

Simulador de ronco e pipoco de motor que roda no navegador, com o painel de instrumentos
no estilo de cada carro (conta-giros e velocímetro) e ligação com o OBD2 do seu carro.

**Abrir:** https://victorcostv.github.io/virtual-pops/

## Carros

| Carro | Motor | Painel |
| --- | --- | --- |
| Chevrolet Camaro SS | V8 6.2 aspirado | Dois relógios com aro cromado, luz azul e ponteiro vermelho |
| Ford Maverick GT 1975 | V8 302 (5.0) | Relógios pretos anos 70, cromado largo, agulha laranja, quadrante P R N D 2 1 e hodômetro |
| Volkswagen Golf GTI | 2.0 TSI turbo | Fundo com colmeia, números brancos, faixa e ponteiros vermelhos, pressão do turbo |
| Honda Civic Type R (EK9) | 1.6 VTEC aspirado (B16B), 8.700 rpm | Relógios brancos com ponteiros vermelhos, conta-giros até 10 mil, visor âmbar e luz do VTEC |
| Porsche 911 GT3 (992) | Boxer 6 4.0 aspirado, 9.000 rpm | Conta-giros central grande com luzes de troca no arco e telas dos lados (velocidade, pedal, giro e modo) |
| Lamborghini Huracán | V10 5.2 | Painel digital com conta-giros central, hexágonos, LEDs de troca e velocidade em dígitos |
| Fórmula 1 anos 2000 | V10 3.0 | Visor do volante com 15 LEDs de troca e LCD de segmentos |

## Como usar

- Toque em **START** (ou pise no acelerador) pra dar a partida.
- **Parado**: acelere e solte de uma vez acima de 3 mil giros pra ouvir o pipoco. Pé embaixo segura no limitador.
- **Andando**: o carro troca de marcha sozinho, com pipoco nas reduções. Aparece o pedal de freio.
- **Pipoco** controla a quantidade de estouros, **Escape** vai do escapamento original ao aberto e **Volume** é o volume.
- No teclado: ↑ ou espaço acelera, ↓ freia.
- Perto do limitador o painel acende **SHIFT**; em cima dele, pisca em vermelho (e os LEDs de troca do Huracán, do 911 GT3 e da F1 piscam juntos).
- No **Civic**, acima de 5.800 rpm com o pé embaixo o **VTEC** entra: o comando troca pro perfil bravo, o ronco fica mais alto e rasgado, a admissão grita, o motor puxa mais e acende a luz VTEC no painel. Segurando o pedal em uns 70% dá pra ficar dentro do VTEC. Pé no fundo, ele bate no corte de giro com aquele "pá-pá-pá"; andando, encosta no corte antes de trocar de marcha.
- O botão de tela cheia liga o **modo painel**: some tudo e ficam só os relógios (com o pedal ao lado quando não há OBD2). A tela não apaga enquanto o motor está ligado. As escolhas ficam salvas no aparelho.

## OBD2

Com um adaptador ELM327 ligado no carro, o giro, o pedal e a velocidade do carro de verdade passam a comandar o som e o painel:

- **Computador (Chrome ou Edge)**: adaptador USB ou Bluetooth comum, pareado no Windows. Toque em *Conectar OBD2* e escolha a porta.
- **Android (Chrome)**: só adaptadores Bluetooth BLE (4.0). Toque em *Adaptador BLE*.
- O giro do carro é convertido pra faixa do carro escolhido. Com o carro parado, pise até o fundo uma vez pra calibrar o pedal.

## App de iPhone

A pasta `ios/` tem o app nativo (Swift) que leva este mesmo site por dentro, sem precisar de internet, e acrescenta o que o navegador do iPhone não tem:

- **OBD2 pelo iPhone**: adaptador ELM327 **Wi-Fi** (conecte o iPhone na rede Wi-Fi do adaptador e toque em *Conectar OBD2 Wi-Fi*) ou **Bluetooth BLE 4.0** (toque em *Adaptador Bluetooth BLE* e escolha na lista). Adaptador Bluetooth comum (2.0) não conversa com o iPhone.
- Vibração nos pipocos grandes e na entrada do VTEC.
- Tela sempre acesa com o motor ligado e modo painel em tela cheia de verdade (some a barra de status).
- O som toca mesmo com a chave de silencioso ligada.

Bundle `br.com.roncopipoco.app`. Como mandar uma versão nova para o TestFlight: [ios/COMO-PUBLICAR.md](ios/COMO-PUBLICAR.md).

## Rodando local

É só abrir o `index.html` no Chrome. Pra ter o cache offline e instalar como app, sirva por HTTP, por exemplo:

```bash
python -m http.server 8765
```

e abra `http://localhost:8765/`.

## Estrutura

- `index.html`, `css/app.css` — página e estilo (tema por carro).
- `js/engine.js` — síntese do som (roda num AudioWorklet).
- `js/cluster.js` — painéis por carro.
- `js/obd.js` — ELM327 por Web Serial e Web Bluetooth.
- `js/app.js` — interface, pedais, garagem e OBD2.
- `sw.js`, `manifest.webmanifest` — app instalável e cache offline.
- `ios/` — app de iPhone: `VirtualPops/` (Swift + `ronco-ios.js`, a ponte com a página), `copia-site.sh` (põe o site dentro do app a cada compilação) e `fontes/` (as fontes, pra funcionar sem internet).

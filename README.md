# Nightrun

Treino de corrida para dois (André e Ivie), com plano adaptativo rumo à próxima prova.
É um web app estático: GitHub Pages + Firestore para sincronizar os dois iPhones.

## 1. Publicar no GitHub Pages

1. Crie o repositório (ex.: `a-hanauer/Nightrun`) e suba todos os arquivos desta pasta para a raiz.
2. Em **Settings › Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O app fica em `https://a-hanauer.github.io/Nightrun/`.

Sem o Firebase configurado, o app funciona em **modo local**: cada iPhone guarda os próprios dados.

## 2. Firebase (já configurado)

- Projeto: `nightrun-3a57c`, app Web "Nightrun Web".
- Banco Firestore criado em `southamerica-east1` (São Paulo).
- As regras de segurança estão em `firestore.rules` e já foram publicadas. Só quem tem o código do casal (20 caracteres) lê ou escreve, e ninguém consegue listar os dados.
- A configuração do app está em `js/firebase-config.js`. Ela é pública por natureza: quem protege os dados são as regras.
- Para ver os dados: Console do Firebase › Firestore Database › coleção `couples`.

## 3. Primeiro uso

1. **André:** abra o link no Safari, toque em *Compartilhar › Adicionar à Tela de Início*, abra pelo ícone, escolha "André" e toque em **Criar código do casal**.
2. Em **Ajustes › Copiar link de convite**, mande o link para a Ivie.
3. **Ivie:** abra o link no Safari. O app já entra no mesmo código. Escolha "Ivie" e depois adicione à tela de início.

Ao adicionar à tela de início, o iOS guarda os dados do app separados do Safari. Por isso, faça a escolha de perfil e o código no app já instalado. Se precisar, o código aparece em Ajustes e pode ser colado.

## Como o plano funciona

- **Degraus.** Cada nível é uma proporção corre:caminha, de 1:1,5 até correr sem parar. Vocês começam no 4:1, que equivale a correr uns 10 minutos sem parar.
- **Meta da prova.** Sai da distância e do objetivo. Para 5 km correndo e caminhando, a meta é 8:1.
- **Semana.** Com 3 treinos: Base, Base e Longão. Com 4, entra um Leve.
- **Adaptação.** Depois de cada treino, cada um registra se completou, o esforço (1 a 5) e se teve dor.
  - Esforço 1 ou 2 conta em dobro para subir.
  - Esforço 4 segura o nível.
  - Esforço 5 ou "Não deu" desce um degrau.
  - Dor que incomodou segura o nível.
- **Ritmo de subida.** Quantos treinos ficam em cada degrau depende de quantos treinos faltam até a prova, com no máximo um degrau por treino.
- **Parada.** Mais de 10 dias sem treinar volta um degrau. Mais de 21, volta dois.
- **Polimento.** Nos 6 dias antes da prova, só dois treinos curtos.
- **Juntos.** Os dois treinam pelo mesmo tempo total, cada um com a própria proporção. Quando as fases divergem, a voz chama cada um pelo nome.

## Limitações do iPhone

- Com a tela bloqueada, o iOS pausa o JavaScript, então os avisos param. O app pede para manter a tela ligada (Wake Lock). Se ela apagar, o tempo continua certo quando você volta.
- O bipe não toca com o iPhone no silencioso. A voz sim.
- Web app não lê o Apple Saúde. Por isso a distância é registrada à mão e é opcional.

## Arquivos

- `index.html`, `css/styles.css`
- `js/app.js`: telas e ações
- `js/plan.js`: lógica de treino (níveis, metas, adaptação, projeção)
- `js/timer.js`: cronômetro, voz e bipe
- `js/store.js`: Firestore ou armazenamento local
- `js/firebase-config.js`: configuração do Firebase
- `sw.js`, `manifest.webmanifest`, `icons/`: instalação na tela de início e uso offline

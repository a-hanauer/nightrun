# Nightrun

Web app estático (sem build) de treino de corrida para duplas (feito para André e Ivie, mas sem nomes fixos: cada dupla cadastra os seus), publicado no GitHub Pages a partir da branch `main`, na raiz do repositório.

- Sincroniza pelo Firestore, projeto Firebase `nightrun-3a57c`. As regras ficam em `firestore.rules` e são publicadas com o plugin do Firebase (`firebase deploy --only firestore`).
- A lógica do plano fica em `js/plan.js` (funções puras, testáveis com Node). Telas em `js/app.js`, cronômetro e voz em `js/timer.js`, dados em `js/store.js`.
- Ao mudar arquivos que o app guarda em cache, suba a versão de `CACHE` em `sw.js` para os iPhones receberem a atualização.
- Interface em português do Brasil. Foco em iPhone, instalado na tela de início.
- Pessoas ficam em slots `p1`/`p2` (campo `order`). A dupla original pode ter as chaves `andre`/`ivie`: nunca use ids fixos no código.

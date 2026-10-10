# Backlog

Melhorias e pendências conhecidas do app de receitas, por prioridade. Ao concluir um item, mova-o para **Concluído** com a data e o commit.

## Prioridade alta

### 1. Receber fotos pelo "Compartilhar" do Android (Web Share Target)

**Problema.** A busca do Google Fotos encontra fotos por conteúdo ("bolo", "receita"), mas só funciona dentro do app Google Fotos. Hoje, para enviar uma foto achada pela busca, é preciso baixá-la para o celular antes e depois escolhê-la na **🖼️ Galeria**.

**Proposta.** Fazer o app aparecer na lista **Compartilhar** do Android: no Google Fotos (ou no Drive, na Galeria etc.), o usuário toca em **Compartilhar → Receitas** e a foto chega direto na tela **Nova receita**, já selecionada, faltando só o nome.

**Como implementar (versão web / PWA).**

- Criar um **manifesto de app web** (`manifest.json`) com nome, ícones, `start_url` e `scope` em `/AppTeste/`, e `display: standalone`.
- Declarar `share_target` no manifesto, aceitando `image/*` e `application/pdf` por `POST` com `multipart/form-data`.
- Criar um **service worker** que:
  - intercepte o `POST` da URL de compartilhamento;
  - guarde o arquivo recebido (por exemplo, em Cache Storage ou IndexedDB);
  - redirecione para `/AppTeste/upload?compartilhado=1`.
- Na tela de upload, ao abrir com `compartilhado=1`, ler o arquivo guardado e reaproveitar o fluxo atual de preparo da foto ou do PDF (`loadImage` / `loadPdf`).
- Incluir o manifesto e o registro do service worker no `index.html` gerado pelo `expo export`, por exemplo com `src/app/+html.tsx` ou arquivos em `public/`. Confirmar que funcionam com o `baseUrl` `/AppTeste`.

**Limitações.**

- Funciona no **Android com Chrome** (e navegadores baseados em Chromium), e só depois de o usuário **instalar o app** pelo menu do navegador (**Instalar app** / **Adicionar à tela inicial**).
- **Não funciona no iPhone**: o Safari não oferece Web Share Target.
- No app nativo (APK via EAS Build), o equivalente é configurar um *intent filter* de compartilhamento. Isso é um item separado e só faz sentido se o APK for adotado.

**Critérios de aceite.**

- [ ] Com o app instalado no Android, **Receitas** aparece em **Compartilhar** no Google Fotos.
- [ ] Compartilhar uma foto (inclusive HEIC e foto que está só na nuvem) abre **Nova receita** com a foto pronta para envio.
- [ ] Compartilhar um PDF abre **Nova receita** com o PDF selecionado e o nome sugerido.
- [ ] Compartilhar um arquivo de outro tipo mostra uma mensagem clara.
- [ ] O app continua funcionando normalmente quando aberto pelo navegador, sem instalação.
- [ ] Teste automatizado do fluxo de upload a partir do arquivo compartilhado.

**Esforço estimado:** médio (manifesto, service worker e ajuste na tela de upload).

### 2. Voltar a usar token fine-grained (segurança)

**Situação atual.** O token *fine-grained* não funcionou no envio de receitas. Para seguir em frente, foi criado um token **clássico**, que dá acesso a vários repositórios ao mesmo tempo. Se ele vazar, o estrago vai além do `Receitas`.

**Medida imediata (enquanto o item não é resolvido).** No token clássico, em <https://github.com/settings/tokens>:

- usar só o escopo **`public_repo`** (não `repo`), o que tira o acesso aos repositórios privados;
- definir uma **data de expiração**.

**O que investigar no fine-grained.**

- [ ] Em **Repository access → Only select repositories**, o `LeoPiresDeSouza/Receitas` está selecionado.
- [ ] Em **Permissions → Repository permissions** (e não em *Account permissions*), **Contents** está como **Read and write**.
- [ ] As alterações foram salvas com **Update**.
- [ ] O token foi criado na conta dona do repositório (`LeoPiresDeSouza`), com **Resource owner** igual a essa conta.
- [ ] Anotar a mensagem exata que o app mostra em **Testar conexão** e no envio. Desde o commit `8aca282`, o app mostra o texto do GitHub.

**Critérios de aceite.**

- [ ] Envio de foto e de PDF funcionando com um token fine-grained restrito ao `Receitas`.
- [ ] Token clássico **revogado**.
- [ ] Se for limitação do app, e não da configuração do token, corrigir o app e registrar a causa aqui.

## Prioridade média

### 3. Manter acentos no nome das receitas enviadas

O nome exibido vem do nome do arquivo, que não tem acentos: "Bolo de Cenoura da Vó" aparece como "Bolo de cenoura da vo". Possível solução: guardar o título original, por exemplo num arquivo `receitas.json` no repositório ou na mensagem do commit, e usá-lo na lista.

### 4. Testar e publicar o app nativo (Android)

A versão nativa nunca foi testada num aparelho. Pontos a validar:

- seleção de fotos e PDFs;
- leitura de arquivos com `expo-file-system`;
- decodificação de texto UTF-8 no Hermes, o motor JavaScript do app nativo.

Gerar o APK com EAS Build (requer conta no Expo).

### 5. Rodar o lint do projeto

`npx expo lint` não foi executado porque o ambiente de desenvolvimento usado até agora bloqueia o servidor do Expo de onde a configuração seria instalada. Configurar o ESLint (`eslint-config-expo`) e incluir o lint no workflow de publicação.

## Prioridade baixa

### 6. Testes automatizados no repositório

Os testes ponta a ponta (Playwright, com a API do GitHub simulada) foram rodados apenas no ambiente de desenvolvimento, fora do repositório. Trazê-los para o projeto e rodá-los no GitHub Actions antes da publicação.

### 7. Editar e excluir receitas

Hoje o app só lista, visualiza e adiciona receitas. Avaliar renomear e excluir arquivos pela API de conteúdo do GitHub.

## Concluído

| Data | Item | Commit |
|---|---|---|
| 2026-10-10 | Botão Enviar explica o que falta e não fica preso durante o preparo da foto | `2c41420` |
| 2026-10-10 | Conversão de fotos HEIC/HEIF e erro do arquivo sempre visível | `3d6df30` |
| 2026-10-10 | Leitura direta do arquivo (corrige "Failed to fetch") | `c42d56a` |
| 2026-10-10 | Botão **📁 Arquivos** para fotos e PDFs do Google Drive | `c1e3e00` |
| 2026-10-10 | Texto de ajuda com link para abrir Arquivos | `7a6c93e` |
| 2026-10-10 | "Testar conexão" verifica a permissão real do token; erros 403 detalhados | `8aca282` |

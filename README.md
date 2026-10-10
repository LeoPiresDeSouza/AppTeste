# Receitas

App mobile (Android, iOS e web) para administrar receitas guardadas num repositório do GitHub.
Por padrão ele usa o repositório [`LeoPiresDeSouza/Receitas`](https://github.com/LeoPiresDeSouza/Receitas), branch `main`.

## Funcionalidades

- **Lista de receitas.** Mostra todos os arquivos de texto (`.txt`, `.md`), imagens (`.jpg`, `.png`, `.webp`, `.gif`) e PDFs do repositório, inclusive em subpastas, com busca por nome.
- **Visualização.** Textos aparecem formatados, imagens são exibidas no app e PDFs abrem no navegador.
- **Envio de receitas novas.** Aceita foto da galeria, foto tirada com a câmera ou um PDF. Cada envio vira um commit no repositório.
  - Imagens são reduzidas para no máximo 1600 px de largura e comprimidas em JPEG antes do envio.
  - PDFs podem ter até 20 MB.
  - Os arquivos são gravados na pasta `uploads/` com o nome da receita e a data, por exemplo `uploads/bolo-de-cenoura-20261010-153012.jpg`.

## Configuração do token

Para **ler** um repositório público não é preciso nada. Para **enviar** receitas, o app precisa de um token pessoal do GitHub:

1. Acesse <https://github.com/settings/personal-access-tokens/new> (o celular serve).
2. Em **Repository access**, escolha **Only select repositories** e selecione o repositório de receitas.
3. Em **Repository permissions**, defina **Contents** como **Read and write**.
4. Gere o token e cole no app, em **⚙️ Configurações**. Use **Testar conexão** para conferir.

O token fica salvo apenas no aparelho, no armazenamento seguro do sistema. Na versão web, fica salvo apenas no navegador. Ele nunca vai para o código.

Nas configurações também dá para trocar o dono, o repositório, o branch e a pasta das receitas novas.

## Como usar sem computador

### Versão web (GitHub Pages)

A cada push no branch `main`, o workflow `.github/workflows/pages.yml` gera a versão web e publica em:

<https://leopiresdesouza.github.io/AppTeste/>

No celular, abra o link e use **Adicionar à tela inicial** para ter um ícone de app.

Para ativar (uma única vez):

1. No repositório, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Em **Actions**, rode novamente o workflow "Publicar versão web no GitHub Pages", se ele já tiver falhado.

> O GitHub Pages em repositório **privado** exige plano pago (GitHub Pro ou superior). No plano gratuito, o repositório precisa ser público. Isso é seguro, porque o token não fica no código.

### App Android (APK)

O APK pode ser gerado nos servidores do Expo com o [EAS Build](https://docs.expo.dev/build/introduction/), que exige uma conta gratuita no Expo.

## Desenvolvimento

```bash
npm install
npm run web        # servidor de desenvolvimento web
npm start          # servidor para Expo Go (Android/iOS)
npm run typecheck  # checagem de tipos
npm run build:web  # gera a versão web em dist/
```

### Estrutura

| Caminho | Conteúdo |
|---|---|
| `src/app/index.tsx` | Lista de receitas |
| `src/app/recipe.tsx` | Visualização de uma receita |
| `src/app/upload.tsx` | Envio de receita nova (imagem ou PDF) |
| `src/app/settings.tsx` | Token e repositório |
| `src/lib/github.ts` | Chamadas à API do GitHub |
| `src/lib/settings.tsx` | Armazenamento das configurações |
| `src/lib/image.ts` | Redução e compressão de imagens |
| `src/lib/read-file*.ts` | Leitura de arquivos em base64 (nativo e web) |

Tecnologias: [Expo](https://expo.dev) SDK 57, React Native, Expo Router e TypeScript.

# BunkerMode Mobile

Aplicativo mobile do BunkerMode criado do zero com Expo, React Native, TypeScript strict e Expo Router.

## Instalação

```bash
cd mobile
npm install
```

## Ambiente

Crie o `.env` local a partir do exemplo:

```bash
cp .env.example .env
```

Configure a URL pública da API sem o sufixo `/api/v2`:

```env
EXPO_PUBLIC_API_URL=https://sua-api-em-producao
```

Para apontar para API local durante desenvolvimento, use o endereço acessível pelo celular na mesma rede:

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:8000
```

Não use `localhost` no Expo Go em aparelho físico.

## Rodar no Expo Go

```bash
npx expo start
```

Leia o QR Code com o Expo Go.

## HTTP e segurança

Este projeto não usa Axios. As requisições passam por `src/api/client.ts`, usando `fetch` nativo, timeout via `AbortController` e token Bearer lido do `expo-secure-store`.

Axios não é usado nesta fase por risco de supply chain, incluindo ataque confirmado em março de 2026.

## Estado atual

- Login
- Restauração de sessão
- Logout
- Token persistido via `expo-secure-store`
- Soldado: listar, criar ordem rápida e concluir ordem
- General: resumo inicial
- Montanha: visão vertical compacta
- Ajustes: health check e logout

## Próximos passos para EAS Build

1. Definir ícones e splash assets reais.
2. Revisar `android.package` e `ios.bundleIdentifier`.
3. Criar `eas.json`.
4. Configurar secrets de produção no EAS.
5. Rodar build interno antes de publicar na Play Store.

## Limitações atuais

- Sem offline-first.
- Sem Redux.
- Sem notificações push.
- Sem publicação Play Store.
- Sem fluxo completo do General web.

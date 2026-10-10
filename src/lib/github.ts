import { Settings } from './settings';
import { kindFromPath, RecipeKind } from './files';

const API = 'https://api.github.com';

export type RecipeEntry = {
  path: string;
  kind: RecipeKind;
  size: number;
};

export type RecipeFile = {
  path: string;
  kind: RecipeKind;
  /** Conteúdo já decodificado, apenas para receitas em texto. */
  text?: string;
  /** URL direta do arquivo (imagens e PDFs). */
  downloadUrl: string;
  /** Página do arquivo no GitHub. */
  htmlUrl: string;
};

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function friendlyMessage(status: number, apiMessage: string): string {
  switch (status) {
    case 401:
      return 'Token inválido ou expirado. Confira o token nas configurações.';
    case 403:
      return 'Sem permissão para esta operação, ou o limite de requisições do GitHub foi atingido.';
    case 404:
      return 'Repositório, branch ou arquivo não encontrado. Confira as configurações.';
    case 409:
      return 'Conflito ao gravar no repositório. Tente novamente.';
    case 413:
      return 'Arquivo grande demais para enviar pela API do GitHub.';
    case 422:
      return `O GitHub recusou os dados enviados: ${apiMessage}`;
    default:
      return `Erro ${status} do GitHub: ${apiMessage}`;
  }
}

async function request<T>(settings: Settings, path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (settings.token) headers.Authorization = `Bearer ${settings.token.trim()}`;
  if (init.body) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    // no-store: sem isso o navegador reaproveita a listagem em cache e uma
    // receita recém-enviada demora a aparecer.
    response = await fetch(API + path, { ...init, cache: 'no-store', headers });
  } catch {
    throw new GitHubError(0, 'Não foi possível conectar ao GitHub. Verifique sua internet.');
  }
  if (!response.ok) {
    let apiMessage = response.statusText;
    try {
      apiMessage = (await response.json()).message ?? apiMessage;
    } catch {
      // Corpo sem JSON: fica o statusText.
    }
    throw new GitHubError(response.status, friendlyMessage(response.status, apiMessage));
  }
  return response.json() as Promise<T>;
}

function repoPath(settings: Settings): string {
  return `/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}`;
}

function contentPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

/** Decodifica base64 em texto UTF-8 (atob sozinho quebra acentos). */
function decodeBase64Utf8(base64: string): string {
  // Sem TextDecoder, que nem todo motor JS do React Native oferece.
  const binary = atob(base64.replace(/\s/g, ''));
  let percentEncoded = '';
  for (let i = 0; i < binary.length; i++) {
    percentEncoded += '%' + binary.charCodeAt(i).toString(16).padStart(2, '0');
  }
  try {
    return decodeURIComponent(percentEncoded);
  } catch {
    // Arquivo que não é UTF-8 válido (ex.: Latin-1): mostramos os bytes como estão.
    return binary;
  }
}

type TreeResponse = {
  tree: { path: string; type: string; size?: number }[];
  truncated: boolean;
};

/** Lista todas as receitas (texto, imagem e PDF) do repositório, inclusive em subpastas. */
export async function listRecipes(settings: Settings): Promise<RecipeEntry[]> {
  const data = await request<TreeResponse>(
    settings,
    `${repoPath(settings)}/git/trees/${encodeURIComponent(settings.branch)}?recursive=1`,
  );
  return data.tree
    .filter((item) => item.type === 'blob')
    .filter((item) => !item.path.split('/').some((part) => part.startsWith('.')))
    .filter((item) => item.path.toLowerCase() !== 'readme.md')
    .map((item) => ({ path: item.path, kind: kindFromPath(item.path), size: item.size ?? 0 }))
    .filter((item): item is RecipeEntry => item.kind !== null)
    .sort((a, b) => a.path.localeCompare(b.path, 'pt-BR'));
}

type ContentResponse = {
  path: string;
  content?: string;
  encoding?: string;
  download_url: string;
  html_url: string;
};

export async function getRecipe(settings: Settings, path: string): Promise<RecipeFile> {
  const kind = kindFromPath(path);
  if (!kind) throw new Error('Tipo de arquivo não suportado.');

  const data = await request<ContentResponse>(
    settings,
    `${repoPath(settings)}/contents/${contentPath(path)}?ref=${encodeURIComponent(settings.branch)}`,
  );
  const file: RecipeFile = { path, kind, downloadUrl: data.download_url, htmlUrl: data.html_url };

  if (kind === 'text') {
    if (data.encoding === 'base64' && data.content) {
      file.text = decodeBase64Utf8(data.content);
    } else {
      // Arquivos acima de 1 MB vêm sem conteúdo; buscamos pela URL direta.
      file.text = await (await fetch(data.download_url)).text();
    }
  }
  return file;
}

/** Cria um arquivo novo no repositório (gera um commit no branch configurado). */
export async function uploadRecipe(
  settings: Settings,
  path: string,
  base64: string,
  message: string,
): Promise<void> {
  await request(settings, `${repoPath(settings)}/contents/${contentPath(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: base64, branch: settings.branch }),
  });
}

type RepoResponse = {
  full_name: string;
  permissions?: { push?: boolean };
};

export type ConnectionCheck = { fullName: string; canPush: boolean };

export async function checkConnection(settings: Settings): Promise<ConnectionCheck> {
  const data = await request<RepoResponse>(settings, repoPath(settings));
  return { fullName: data.full_name, canPush: Boolean(data.permissions?.push) };
}

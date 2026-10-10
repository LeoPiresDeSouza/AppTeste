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
    public rateLimited = false,
  ) {
    super(message);
  }
}

const TOKEN_PERMISSION_HELP =
  'No GitHub, edite o token: em "Repository access" inclua este repositório e em ' +
  '"Permissions → Repository permissions" defina "Contents" como "Read and write".';

/** Resposta de limite de requisições: 403/429 com X-RateLimit-Remaining zerado. */
function rateLimitMessage(response: Response): string | null {
  if (response.status !== 403 && response.status !== 429) return null;
  if (response.headers.get('x-ratelimit-remaining') !== '0') return null;
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  const when = reset
    ? ` Tente de novo depois das ${new Date(reset * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
    : ' Tente de novo em alguns minutos.';
  return `Limite de requisições do GitHub atingido.${when}`;
}

function friendlyMessage(settings: Settings, status: number, apiMessage: string): string {
  const repo = `${settings.owner}/${settings.repo}`;
  switch (status) {
    case 401:
      return 'Token inválido ou expirado. Confira o token nas configurações.';
    case 403:
      if (/not accessible by (personal access|integration)/i.test(apiMessage)) {
        return `O token não tem permissão para gravar em ${repo}. ${TOKEN_PERMISSION_HELP}`;
      }
      return `O GitHub recusou a operação em ${repo} por falta de permissão (${apiMessage}). ${TOKEN_PERMISSION_HELP}`;
    case 429:
      return 'O GitHub recebeu requisições demais em pouco tempo. Aguarde um minuto e tente de novo.';
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
    const limit = rateLimitMessage(response);
    throw new GitHubError(response.status, limit ?? friendlyMessage(settings, response.status, apiMessage), !!limit);
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

/** O GitHub responde 409 ao ler a árvore de um repositório sem nenhum commit. */
function isEmptyRepoError(error: unknown): boolean {
  return error instanceof GitHubError && error.status === 409;
}

async function getTree(settings: Settings): Promise<TreeResponse> {
  return request<TreeResponse>(
    settings,
    `${repoPath(settings)}/git/trees/${encodeURIComponent(settings.branch)}?recursive=1`,
  );
}

/** Lista todas as receitas (texto, imagem e PDF) do repositório, inclusive em subpastas. */
export async function listRecipes(settings: Settings): Promise<RecipeEntry[]> {
  let data: TreeResponse;
  try {
    data = await getTree(settings);
  } catch (error) {
    if (isEmptyRepoError(error)) return [];
    throw error;
  }
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
  const put = (body: object) =>
    request(settings, `${repoPath(settings)}/contents/${contentPath(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ message, content: base64, ...body }),
    });
  try {
    await put({ branch: settings.branch });
  } catch (error) {
    // Num repositório vazio o branch ainda não existe. Nesse caso o primeiro
    // arquivo vai sem branch, e o GitHub cria o commit inicial no branch padrão.
    const repoIsEmpty = await getTree(settings).then(
      () => false,
      (treeError) => isEmptyRepoError(treeError),
    );
    if (!repoIsEmpty) throw error;
    await put({});
  }
}

type RepoResponse = { full_name: string };

export type ConnectionCheck = {
  fullName: string;
  /** O próprio token pode gravar arquivos. null quando não deu para verificar. */
  tokenCanWrite: boolean | null;
  /** Mensagem do GitHub quando o token não pode gravar. */
  writeError?: string;
};

/**
 * Verifica se o token consegue gravar sem criar nada: envia uma gravação sem
 * conteúdo. Com permissão, o GitHub recusa os dados (422); sem permissão, ele
 * recusa o acesso (401/403/404) antes de olhar os dados.
 */
async function probeWrite(settings: Settings): Promise<Pick<ConnectionCheck, 'tokenCanWrite' | 'writeError'>> {
  try {
    await request(settings, `${repoPath(settings)}/contents/.teste-de-permissao-do-app`, {
      method: 'PUT',
      body: JSON.stringify({ branch: settings.branch }),
    });
    return { tokenCanWrite: true };
  } catch (error) {
    if (!(error instanceof GitHubError)) return { tokenCanWrite: null };
    if (error.rateLimited) return { tokenCanWrite: null, writeError: error.message };
    if (error.status === 422) return { tokenCanWrite: true };
    if ([401, 403, 404].includes(error.status)) return { tokenCanWrite: false, writeError: error.message };
    return { tokenCanWrite: null, writeError: error.message };
  }
}

export async function checkConnection(settings: Settings): Promise<ConnectionCheck> {
  const data = await request<RepoResponse>(settings, repoPath(settings));
  // Em tokens "fine-grained", `permissions` reflete a conta, não o token: por
  // isso a escrita é testada à parte.
  const write = settings.token ? await probeWrite(settings) : { tokenCanWrite: false };
  return { fullName: data.full_name, ...write };
}
